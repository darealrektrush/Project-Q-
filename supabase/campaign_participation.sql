-- Generic participation-mission bridge for Bond the Duck: website voting and
-- Telegram trending-bot confirmations. Mirrors the ingest_oracle_raid_event
-- shape (accept-then-settle, never trust the client, fail closed) but is
-- source-agnostic so each of the nine voting sites and four trending bots
-- reuses one table and one RPC instead of one-off schemas per integration.
--
-- Unlike Oracle raids (where Oracle itself verifies the X action before
-- calling Project Q), Project Q is the verifier here per
-- docs/BOND-THE-DUCK-TELEGRAM-UI.md: "Telegram bot flow: ... validate
-- numeric bot origin, FAWKQ context, time and uniqueness". That per-site
-- verification logic is intentionally NOT included in this migration --
-- each site/bot needs its own adapter (reading the vote number format, bot
-- receipt format, etc. from that specific integration) that calls
-- ingest_campaign_participation_event only after doing its own check.
-- Until an adapter exists for a given source_key, keep its
-- verification_sources.classification at 'SOURCE_UNAVAILABLE' so nothing
-- can be ingested for it (see the classification check inside the RPC).

-- verification_sources (defined in bond_the_duck.sql) is shared by both the
-- 9 website-voting sources and the 4 Telegram trending-bot sources, keyed
-- only by source_key. The vote-completion bonus in
-- participationSettlement.js needs to know which source_keys are voting
-- sites (as opposed to bots) to count "every currently available voting
-- site credited" -- add that distinction here rather than inferring it from
-- naming conventions.
alter table verification_sources
  add column if not exists source text not null default 'vote' check (source in ('vote', 'event'));

create table if not exists campaign_participation_events (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
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
  on campaign_participation_events(campaign_id, telegram_user_id, received_at);
create index if not exists campaign_participation_events_source_idx
  on campaign_participation_events(campaign_id, source_key, telegram_user_id, received_at);

alter table campaign_participation_events enable row level security;
revoke all on campaign_participation_events from anon, authenticated;
grant select, insert, update, delete on campaign_participation_events to service_role;
grant usage, select on sequence campaign_participation_events_id_seq to service_role;

-- Accept one already-verified participation event (a website vote or a
-- Telegram trending-bot confirmation) into the campaign ledger. As with
-- ingest_oracle_raid_event, this only records that a claimed action arrived;
-- it never decides XP -- that is the separate settlement pipeline
-- (src/campaign/xpSettlement.js), applying the same 15 XP/day participation
-- cap and 75 XP/day overall cap as every other campaign XP source.
create or replace function ingest_campaign_participation_event(
  p_campaign_id text,
  p_source text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_evidence_ref text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns campaign_participation_events
language plpgsql security invoker set search_path = public as $$
declare
  result campaign_participation_events;
  active_cycle integer;
  source_row verification_sources;
  last_event_at timestamptz;
begin
  select * into result from campaign_participation_events
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

  if not exists (select 1 from campaigns where id = p_campaign_id and state = 'ACTIVE') then
    raise exception 'campaign is not active';
  end if;
  if p_verified_at > now() + interval '5 minutes' then
    raise exception 'verified event timestamp is in the future';
  end if;

  select * into source_row from verification_sources
    where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.classification in ('SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY') then
    raise exception 'participation source is not accepting verified events';
  end if;

  if not exists (
    select 1 from identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity is not verified'; end if;

  if source_row.cooldown_seconds > 0 then
    select max(received_at) into last_event_at from campaign_participation_events
      where campaign_id = p_campaign_id and source_key = p_source_key
        and telegram_user_id = p_telegram_user_id;
    if last_event_at is not null and p_verified_at < last_event_at + make_interval(secs => source_row.cooldown_seconds) then
      raise exception 'participation source is on cooldown for this participant';
    end if;
  end if;

  select cycle_id into active_cycle from cycles
    where campaign_id = p_campaign_id
      and p_verified_at >= opens_at and p_verified_at < closes_at
    order by cycle_id limit 1;
  if active_cycle is null then raise exception 'verified event is outside an active cycle'; end if;

  insert into campaign_participation_events
    (campaign_id, cycle_id, source, source_key, telegram_user_id, evidence_ref,
     verified_at, idempotency_key, credited)
  values
    (p_campaign_id, active_cycle, p_source, p_source_key, p_telegram_user_id, p_evidence_ref,
     p_verified_at, p_idempotency_key, false)
  on conflict (campaign_id, idempotency_key) do nothing
  returning * into result;
  if result.id is null then
    select * into result from campaign_participation_events
      where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  end if;
  return result;
end;
$$;

revoke all on function ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  to service_role;
