-- Bond the Duck Bagwork campaign XP bridge.
-- The existing bagwork_payouts row is the source-of-truth receipt. This layer
-- records one immutable campaign settlement per paid submission and writes
-- Bond XP through the mission/overall caps. It does not change Bagwork payouts.

create table if not exists public.campaign_bagwork_events (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  submission_id text not null references public.bagwork_payouts(submission_id),
  telegram_user_id bigint not null,
  cycle_id integer not null,
  proposed_xp integer not null check (proposed_xp >= 0),
  credited_xp integer not null default 0 check (credited_xp >= 0),
  xp_ledger_id bigint references public.xp_ledger(id),
  status text not null default 'PENDING'
    check (status in ('PENDING','CREDITED','CAPPED','REJECTED')),
  reason text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, submission_id),
  foreign key (campaign_id, cycle_id) references public.cycles(campaign_id, cycle_id)
);

create index if not exists campaign_bagwork_events_user_idx
  on public.campaign_bagwork_events(campaign_id, telegram_user_id, created_at);

alter table public.campaign_bagwork_events enable row level security;
revoke all on public.campaign_bagwork_events from public, anon, authenticated;
grant select, insert, update on public.campaign_bagwork_events to service_role;
grant usage, select on sequence public.campaign_bagwork_events_id_seq to service_role;

create or replace function public.settle_campaign_bagwork_payout(
  p_campaign_id text,
  p_submission_id text
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  payout public.bagwork_payouts;
  campaign_row public.campaigns;
  identity_row public.identity_links;
  existing public.campaign_bagwork_events;
  active_cycle integer;
  local_day date;
  day_start timestamptz;
  day_end timestamptz;
  overall_used bigint;
  mission_used bigint;
  overall_remaining integer;
  mission_remaining integer;
  proposed integer;
  award integer;
  ledger_row public.xp_ledger;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_submission_id is null or btrim(p_submission_id) = ''
  then
    raise exception 'invalid Bagwork campaign settlement input';
  end if;

  select * into payout
  from public.bagwork_payouts
  where submission_id = p_submission_id;

  if not found or payout.user_id is null then
    raise exception 'Bagwork payout is not bound to a Telegram user';
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id;

  if not found or campaign_row.state not in ('ACTIVE','VERIFYING') then
    raise exception 'campaign is not accepting Bagwork settlement';
  end if;

  select * into identity_row
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = payout.user_id;

  if not found
    or identity_row.profile_id is null
    or identity_row.x_verified_at is null
  then
    raise exception 'Bagwork participant does not have a verified campaign identity';
  end if;

  select cycle_id into active_cycle
  from public.cycles
  where campaign_id = p_campaign_id
    and payout.paid_at >= opens_at
    and payout.paid_at < closes_at
  order by cycle_id
  limit 1;

  if active_cycle is null then
    raise exception 'Bagwork payout is outside an active campaign cycle';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_campaign_id || ':bagwork:' || p_submission_id, 0)
  );

  select * into existing
  from public.campaign_bagwork_events
  where campaign_id = p_campaign_id
    and submission_id = p_submission_id
  for update;

  if found and existing.status in ('CREDITED','CAPPED') then
    return jsonb_build_object(
      'status', existing.status,
      'creditedXp', existing.credited_xp,
      'ledgerId', existing.xp_ledger_id,
      'replayed', true
    );
  end if;

  proposed := greatest(0, least(coalesce(payout.xp_awarded, 0)::integer, 2147483647));

  if not found then
    insert into public.campaign_bagwork_events (
      campaign_id, submission_id, telegram_user_id, cycle_id, proposed_xp
    ) values (
      p_campaign_id, p_submission_id, payout.user_id, active_cycle, proposed
    )
    returning * into existing;
  else
    if existing.telegram_user_id <> payout.user_id
      or existing.cycle_id <> active_cycle
      or existing.proposed_xp <> proposed
    then
      raise exception 'Bagwork campaign settlement terms changed';
    end if;
  end if;

  local_day := (payout.paid_at at time zone 'America/Vancouver')::date;
  day_start := local_day::timestamp at time zone 'America/Vancouver';
  day_end := (local_day + 1)::timestamp at time zone 'America/Vancouver';

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_campaign_id || ':' || payout.user_id::text || ':' || local_day::text,
      0
    )
  );

  lock table public.xp_ledger in share row exclusive mode;

  select
    coalesce(sum(amount) filter (where amount > 0), 0),
    coalesce(sum(amount) filter (where amount > 0 and cap_bucket = 'mission'), 0)
  into overall_used, mission_used
  from public.xp_ledger
  where campaign_id = p_campaign_id
    and telegram_user_id = payout.user_id
    and awarded_at >= day_start
    and awarded_at < day_end;

  overall_remaining := greatest(0, 75 - overall_used::integer);
  mission_remaining := greatest(0, 20 - mission_used::integer);
  award := least(proposed, overall_remaining, mission_remaining);

  if award <= 0 then
    update public.campaign_bagwork_events
    set credited_xp = 0,
        status = 'CAPPED',
        reason = 'daily_cap',
        settled_at = now()
    where id = existing.id;

    return jsonb_build_object(
      'status', 'CAPPED', 'creditedXp', 0, 'ledgerId', null, 'replayed', false
    );
  end if;

  insert into public.xp_ledger (
    campaign_id, cycle_id, telegram_user_id, source, cap_bucket,
    amount, mission_code, idempotency_key, awarded_at
  ) values (
    p_campaign_id, active_cycle, payout.user_id, 'mission', 'mission',
    award, 'bagwork', 'bagwork-payout:' || p_submission_id, payout.paid_at
  )
  on conflict (campaign_id, idempotency_key) do nothing
  returning * into ledger_row;

  if ledger_row.id is null then
    select * into ledger_row
    from public.xp_ledger
    where campaign_id = p_campaign_id
      and idempotency_key = 'bagwork-payout:' || p_submission_id;
  end if;

  if ledger_row.id is null
    or ledger_row.telegram_user_id <> payout.user_id
    or ledger_row.cycle_id <> active_cycle
    or ledger_row.cap_bucket <> 'mission'
    or ledger_row.amount <> award
    or ledger_row.mission_code <> 'bagwork'
  then
    raise exception 'Bagwork XP idempotency conflict';
  end if;

  update public.campaign_bagwork_events
  set credited_xp = award,
      xp_ledger_id = ledger_row.id,
      status = 'CREDITED',
      reason = null,
      settled_at = now()
  where id = existing.id;

  return jsonb_build_object(
    'status', 'CREDITED',
    'creditedXp', award,
    'ledgerId', ledger_row.id,
    'cycleId', active_cycle,
    'replayed', false
  );
end;
$$;

revoke all on function public.settle_campaign_bagwork_payout(text,text)
  from public, anon, authenticated;
grant execute on function public.settle_campaign_bagwork_payout(text,text)
  to service_role;
