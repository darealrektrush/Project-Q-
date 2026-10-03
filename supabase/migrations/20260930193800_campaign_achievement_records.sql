-- Project Q achievement receipts are append-only campaign facts. Project Q
-- verifies and owns the receipt; delivery to Oracle is a separate outbox event.

create table if not exists public.campaign_achievement_records (
  record_id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.campaigns(id) on delete restrict,
  profile_id uuid not null,
  telegram_user_id bigint not null check (telegram_user_id > 0),
  operation_key text not null check (operation_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  achievement_id text not null check (achievement_id ~ '^[a-z0-9][a-z0-9_-]{0,95}$'),
  collection_key text not null check (collection_key in ('campaign','xp','standings','missions','impact','economic')),
  rarity_tier text check (rarity_tier is null or rarity_tier in ('standard','advanced','rare','elite','legendary')),
  criteria_version text not null check (char_length(criteria_version) between 1 and 80),
  verification_source text not null check (verification_source ~ '^[a-z][a-z0-9_]{2,63}$'),
  source_ref text not null check (char_length(source_ref) between 1 and 180),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  verification_state text not null default 'VERIFIED' check (verification_state = 'VERIFIED'),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, profile_id, operation_key, achievement_id),
  unique (campaign_id, achievement_id, source_ref),
  foreign key (campaign_id, profile_id)
    references public.identity_links(campaign_id, profile_id) on delete restrict
);

create index if not exists campaign_achievement_records_profile_history_idx
  on public.campaign_achievement_records(profile_id, verified_at desc, record_id desc);
create index if not exists campaign_achievement_records_campaign_award_idx
  on public.campaign_achievement_records(campaign_id, achievement_id, verified_at desc);

alter table public.campaign_achievement_records enable row level security;
revoke all on public.campaign_achievement_records from public, anon, authenticated;
grant select, insert on public.campaign_achievement_records to service_role;

create or replace function public.reject_campaign_achievement_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'campaign achievement receipts are append-only';
end;
$$;
revoke all on function public.reject_campaign_achievement_mutation()
  from public, anon, authenticated;

drop trigger if exists campaign_achievement_receipt_immutable
  on public.campaign_achievement_records;
create trigger campaign_achievement_receipt_immutable
before update or delete on public.campaign_achievement_records
for each row execute function public.reject_campaign_achievement_mutation();

-- A participant earns XP Earned only when a positive, settled xp_ledger row
-- exists. The unique operation/achievement key makes retries harmless.
create or replace function public.record_xp_earned_achievement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.amount <= 0 or new.profile_id is null then return new; end if;

  insert into public.campaign_achievement_records (
    campaign_id, profile_id, telegram_user_id, operation_key, achievement_id,
    collection_key, rarity_tier, criteria_version, verification_source, source_ref,
    result, verified_at
  ) values (
    new.campaign_id, new.profile_id, new.telegram_user_id, 'operation-01', 'xp-earned',
    'xp', 'standard', 'bond-xp-earned-v1', 'settled_xp_ledger',
    'xp-ledger:' || new.id::text,
    jsonb_build_object('settled_xp', new.amount, 'cycle_id', new.cycle_id),
    new.awarded_at
  )
  on conflict (campaign_id, profile_id, operation_key, achievement_id) do nothing;
  return new;
end;
$$;
revoke all on function public.record_xp_earned_achievement()
  from public, anon, authenticated;

drop trigger if exists xp_ledger_record_xp_earned_achievement on public.xp_ledger;
create trigger xp_ledger_record_xp_earned_achievement
after insert on public.xp_ledger
for each row execute function public.record_xp_earned_achievement();

-- The existing Q→Oracle outbox transports the earned receipt to the linked
-- Universal Profile. Oracle must accept this versioned event before delivery
-- can complete; failed delivery remains retryable and never rolls back XP.
alter table public.oracle_platform_outbox
  drop constraint if exists oracle_platform_outbox_event_name_check;
alter table public.oracle_platform_outbox
  add constraint oracle_platform_outbox_event_name_check
  check (event_name in (
    'campaign.joined',
    'campaign.mission.completed',
    'campaign.achievement.earned'
  ));
alter table public.oracle_platform_outbox
  add column if not exists profile_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists event_metadata jsonb not null default '{}'::jsonb;

create index if not exists oracle_platform_outbox_profile_achievement_idx
  on public.oracle_platform_outbox(profile_id, id desc)
  where event_name = 'campaign.achievement.earned';

create or replace function public.enqueue_campaign_achievement_profile_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.oracle_platform_outbox (
    event_key, event_name, campaign_id, telegram_user_id, occurred_at,
    profile_id, entity_type, entity_id, event_metadata
  ) values (
    'campaign.achievement.earned:' || new.record_id::text,
    'campaign.achievement.earned', new.campaign_id, new.telegram_user_id,
    new.verified_at, new.profile_id, 'campaign_achievement', new.record_id::text,
    jsonb_build_object(
      'receipt_id', new.record_id,
      'achievement_id', new.achievement_id,
      'collection', new.collection_key,
      'rarity_tier', new.rarity_tier,
      'criteria_version', new.criteria_version,
      'verification_state', new.verification_state,
      'verification_source', new.verification_source,
      'source_ref', new.source_ref,
      'result', new.result
    )
  )
  on conflict (event_key) do nothing;
  return new;
end;
$$;
revoke all on function public.enqueue_campaign_achievement_profile_event()
  from public, anon, authenticated;

drop trigger if exists campaign_achievement_profile_event_outbox
  on public.campaign_achievement_records;
create trigger campaign_achievement_profile_event_outbox
after insert on public.campaign_achievement_records
for each row execute function public.enqueue_campaign_achievement_profile_event();
