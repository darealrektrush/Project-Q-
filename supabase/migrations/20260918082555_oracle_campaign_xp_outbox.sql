-- Every Project Q XP fact is permanently bound to CrabStar ID. Delivery to
-- Oracle uses an outbox so a network failure can never roll back campaign
-- settlement or silently lose the cross-ecosystem XP event.

alter table public.xp_ledger
  add column if not exists profile_id uuid references public.crabstar_profiles(profile_id);

update public.xp_ledger ledger
set profile_id = identity.profile_id
from public.identity_links identity
where identity.campaign_id = ledger.campaign_id
  and identity.telegram_user_id = ledger.telegram_user_id
  and ledger.profile_id is null;

do $$
begin
  if exists (select 1 from public.xp_ledger where profile_id is null) then
    raise exception 'campaign XP exists without a permanent Oracle profile';
  end if;
end;
$$;

alter table public.xp_ledger alter column profile_id set not null;

create index if not exists xp_ledger_profile_awarded_idx
  on public.xp_ledger(profile_id, awarded_at desc);

create table if not exists public.campaign_xp_exports (
  export_id bigint generated always as identity primary key,
  xp_ledger_id bigint not null unique references public.xp_ledger(id),
  profile_id uuid not null references public.crabstar_profiles(profile_id),
  telegram_user_id bigint not null,
  campaign_id text not null references public.campaigns(id),
  cycle_id integer not null,
  source text not null,
  mission_code text,
  campaign_score bigint not null check (campaign_score >= 0),
  base_xp integer not null check (base_xp > 0),
  verification_state text not null default 'verified'
    check (verification_state in ('verified')),
  occurred_at timestamptz not null,
  finalized_at timestamptz not null default now(),
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 8),
  next_attempt_at timestamptz not null default now(),
  last_error_code text check (
    last_error_code is null or last_error_code in (
      'timeout', 'network', 'http_4xx', 'http_5xx', 'invalid_response'
    )
  ),
  oracle_receipt_id uuid,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'delivered' and delivered_at is not null and oracle_receipt_id is not null)
    or (status <> 'delivered' and delivered_at is null and oracle_receipt_id is null)
  )
);

create index if not exists campaign_xp_exports_pending_idx
  on public.campaign_xp_exports(next_attempt_at, export_id)
  where status = 'pending';

alter table public.campaign_xp_exports enable row level security;
revoke all on public.campaign_xp_exports from public, anon, authenticated;
grant select, insert, update on public.campaign_xp_exports to service_role;
grant usage, select on sequence public.campaign_xp_exports_export_id_seq to service_role;

create or replace function public.bind_campaign_xp_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  canonical_profile_id uuid;
begin
  select profile_id into canonical_profile_id
  from public.identity_links
  where campaign_id = new.campaign_id
    and telegram_user_id = new.telegram_user_id;

  if canonical_profile_id is null then
    raise exception 'campaign participant has no permanent Oracle profile';
  end if;
  if new.profile_id is not null and new.profile_id <> canonical_profile_id then
    raise exception 'campaign XP profile mismatch';
  end if;

  new.profile_id := canonical_profile_id;
  return new;
end;
$$;

revoke all on function public.bind_campaign_xp_profile()
  from public, anon, authenticated;

drop trigger if exists xp_ledger_bind_profile on public.xp_ledger;
create trigger xp_ledger_bind_profile
before insert on public.xp_ledger
for each row execute function public.bind_campaign_xp_profile();

create or replace function public.enqueue_campaign_xp_export()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.campaign_xp_exports (
    xp_ledger_id, profile_id, telegram_user_id, campaign_id, cycle_id,
    source, mission_code, campaign_score, base_xp, occurred_at,
    idempotency_key
  ) values (
    new.id, new.profile_id, new.telegram_user_id, new.campaign_id, new.cycle_id,
    new.source, new.mission_code, new.amount, new.amount, new.awarded_at,
    'project-q:xp-ledger:' || new.id::text
  )
  on conflict (xp_ledger_id) do nothing;
  return new;
end;
$$;

revoke all on function public.enqueue_campaign_xp_export()
  from public, anon, authenticated;

drop trigger if exists xp_ledger_enqueue_oracle_export on public.xp_ledger;
create trigger xp_ledger_enqueue_oracle_export
after insert on public.xp_ledger
for each row execute function public.enqueue_campaign_xp_export();
