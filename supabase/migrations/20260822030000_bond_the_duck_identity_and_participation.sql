-- Add the server-only Oracle identity bridge and generic verified
-- participation-event foundation. This migration does not activate, fund,
-- schedule, or seed the Bond the Duck campaign.

create or replace function public.link_oracle_identity(
  p_campaign_id text,
  p_telegram_user_id bigint,
  p_x_user_id text,
  p_verified_at timestamptz
) returns public.identity_links
language plpgsql security invoker set search_path = public as $$
declare
  result public.identity_links;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_x_user_id is null or btrim(p_x_user_id) !~ '^[0-9]{1,30}$'
    or p_verified_at is null
  then
    raise exception 'invalid Oracle identity';
  end if;
  if p_verified_at > now() + interval '5 minutes' then
    raise exception 'Oracle verification timestamp is in the future';
  end if;
  if not exists (select 1 from public.campaigns where id = p_campaign_id) then
    raise exception 'unknown campaign';
  end if;
  if exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_user_id is not null
      and x_user_id <> btrim(p_x_user_id)
  ) then raise exception 'Telegram identity is already linked to another X account'; end if;
  if exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id
      and x_user_id = btrim(p_x_user_id)
      and telegram_user_id <> p_telegram_user_id
  ) then raise exception 'X identity is already linked to another Telegram account'; end if;

  insert into public.identity_links (campaign_id, telegram_user_id, x_user_id, x_verified_at)
  values (p_campaign_id, p_telegram_user_id, btrim(p_x_user_id), p_verified_at)
  on conflict (campaign_id, telegram_user_id) do update
    set x_user_id = excluded.x_user_id,
        x_verified_at = greatest(identity_links.x_verified_at, excluded.x_verified_at)
  returning * into result;
  return result;
end;
$$;

revoke all on function public.link_oracle_identity(text,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.link_oracle_identity(text,bigint,text,timestamptz)
  to service_role;

alter table public.verification_sources
  add column if not exists source text not null default 'vote'
  check (source in ('vote', 'event'));

create table if not exists public.campaign_participation_events (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  cycle_id integer check (cycle_id between 1 and 5),
  source text not null check (source in ('vote', 'event')),
  source_key text not null,
  telegram_user_id bigint not null,
  evidence_ref text not null,
  verified_at timestamptz not null,
  idempotency_key text not null,
  credited boolean not null default false,
  reason text,
  received_at timestamptz not null default now(),
  unique (campaign_id, idempotency_key),
  unique (campaign_id, source_key, telegram_user_id, evidence_ref)
);

create index if not exists campaign_participation_events_participant_idx
  on public.campaign_participation_events(campaign_id, telegram_user_id, received_at);
create index if not exists campaign_participation_events_source_idx
  on public.campaign_participation_events(campaign_id, source_key, telegram_user_id, received_at);

alter table public.campaign_participation_events enable row level security;
revoke all on public.campaign_participation_events from anon, authenticated;
grant select, insert, update, delete on public.campaign_participation_events to service_role;
grant usage, select on sequence public.campaign_participation_events_id_seq to service_role;

create or replace function public.ingest_campaign_participation_event(
  p_campaign_id text,
  p_source text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_evidence_ref text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns public.campaign_participation_events
language plpgsql security invoker set search_path = public as $$
declare
  result public.campaign_participation_events;
  active_cycle integer;
  source_row public.verification_sources;
  last_event_at timestamptz;
begin
  select * into result from public.campaign_participation_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  if found then
    if result.source is distinct from p_source
      or result.source_key is distinct from p_source_key
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.evidence_ref is distinct from p_evidence_ref
      or result.verified_at is distinct from p_verified_at
    then
      raise exception 'idempotency key was reused with a different participation event';
    end if;
    return result;
  end if;

  if not exists (
    select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE'
  ) then raise exception 'campaign is not active'; end if;
  if p_verified_at > now() + interval '5 minutes' then
    raise exception 'verified event timestamp is in the future';
  end if;

  select * into source_row from public.verification_sources
    where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.classification in ('SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY') then
    raise exception 'participation source is not accepting verified events';
  end if;
  if source_row.source is distinct from p_source then
    raise exception 'participation source type does not match registry';
  end if;

  if not exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity is not verified'; end if;

  if source_row.cooldown_seconds > 0 then
    select max(received_at) into last_event_at
    from public.campaign_participation_events
    where campaign_id = p_campaign_id
      and source_key = p_source_key
      and telegram_user_id = p_telegram_user_id;
    if last_event_at is not null
      and p_verified_at < last_event_at + make_interval(secs => source_row.cooldown_seconds)
    then raise exception 'participation source is on cooldown for this participant'; end if;
  end if;

  select cycle_id into active_cycle from public.cycles
  where campaign_id = p_campaign_id
    and p_verified_at >= opens_at and p_verified_at < closes_at
  order by cycle_id limit 1;
  if active_cycle is null then
    raise exception 'verified event is outside an active cycle';
  end if;

  insert into public.campaign_participation_events
    (campaign_id, cycle_id, source, source_key, telegram_user_id, evidence_ref,
     verified_at, idempotency_key, credited)
  values
    (p_campaign_id, active_cycle, p_source, p_source_key, p_telegram_user_id,
     p_evidence_ref, p_verified_at, p_idempotency_key, false)
  on conflict (campaign_id, idempotency_key) do nothing
  returning * into result;
  if result.id is null then
    select * into result from public.campaign_participation_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  end if;
  return result;
end;
$$;

revoke all on function public.ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  to service_role;
