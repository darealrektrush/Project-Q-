-- Bond the Duck campaign foundation. Design/build only: creates no wallets,
-- signs no transactions, schedules no jobs, and leaves every campaign DRAFT.

create table if not exists campaigns (
  id text primary key,
  ruleset_version integer not null check (ruleset_version > 0),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  registry_version integer,
  state text not null default 'DRAFT' check (state in (
    'DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING',
    'ALLOCATIONS_FROZEN','DISTRIBUTING','COMPLETED','ARCHIVED','PAUSED','TERMINATED'
  )),
  resume_state text,
  funded_base_units numeric(39,0) not null default 0 check (funded_base_units >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ruleset_versions (
  campaign_id text not null references campaigns(id),
  version integer not null check (version > 0),
  rules_json jsonb not null check (jsonb_typeof(rules_json) = 'object'),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (campaign_id, version),
  unique (campaign_id, rules_hash)
);

create table if not exists deployment_registry (
  campaign_id text not null references campaigns(id),
  version integer not null check (version > 0),
  field text not null,
  value text,
  owner text,
  evidence_url text,
  registry_hash text not null check (registry_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (campaign_id, version, field)
);

create table if not exists campaign_state_transitions (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  from_state text not null check (from_state in (
    'DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING',
    'ALLOCATIONS_FROZEN','DISTRIBUTING','COMPLETED','ARCHIVED','PAUSED','TERMINATED'
  )),
  to_state text not null check (to_state in (
    'DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING',
    'ALLOCATIONS_FROZEN','DISTRIBUTING','COMPLETED','ARCHIVED','PAUSED','TERMINATED'
  )),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object' and evidence <> '{}'::jsonb),
  authorized_signers integer not null default 0 check (authorized_signers between 0 and 2),
  automatic_security_pause boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists identity_links (
  campaign_id text not null references campaigns(id),
  telegram_user_id bigint not null,
  x_user_id text,
  reward_wallet text,
  telegram_created_at timestamptz,
  x_created_at timestamptz,
  x_verified_at timestamptz,
  wallet_verified_at timestamptz,
  fawkq_token_account text,
  enrolled_at timestamptz not null default now(),
  primary key (campaign_id, telegram_user_id),
  unique (campaign_id, x_user_id),
  unique (campaign_id, reward_wallet)
);

create table if not exists wallet_challenges (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  telegram_user_id bigint not null,
  nonce text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes')
);

create table if not exists cycles (
  campaign_id text not null references campaigns(id),
  cycle_id integer not null check (cycle_id between 1 and 5),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  cutoff_slot bigint,
  cutoff_blockhash text,
  commit_hash text,
  reveal_value text,
  fallback_used boolean not null default false,
  allocation_base_units numeric(39,0) not null check (allocation_base_units >= 0),
  finalized_at timestamptz,
  primary key (campaign_id, cycle_id),
  check (closes_at = opens_at + interval '48 hours')
);

create table if not exists xp_ledger (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  cycle_id integer not null check (cycle_id between 1 and 5),
  telegram_user_id bigint not null,
  source text not null check (source in ('raid','vote','mission','event','content','onboarding','education','idea')),
  cap_bucket text not null check (cap_bucket in ('participation','mission','other')),
  amount integer not null check (amount >= 0),
  mission_code text,
  idempotency_key text not null,
  awarded_at timestamptz not null default now(),
  unique (campaign_id, idempotency_key)
);

create table if not exists campaign_raid_events (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  cycle_id integer check (cycle_id between 1 and 5),
  raid_id text not null,
  action text not null check (action in ('like','retweet','reply','bookmark','quotepost')),
  x_user_id text not null,
  telegram_user_id bigint,
  tweet_id text,
  verified_at timestamptz not null,
  idempotency_key text not null,
  credited boolean not null default false,
  reason text,
  received_at timestamptz not null default now(),
  unique (campaign_id, idempotency_key),
  unique (campaign_id, raid_id, x_user_id, action)
);

create table if not exists verification_sources (
  campaign_id text not null references campaigns(id),
  source_key text not null,
  classification text not null check (classification in (
    'MACHINE_VERIFIED','PROOF_SUPPORTED','COMMUNITY_PROGRESS_ONLY',
    'SOURCE_UNAVAILABLE','REMOVED_FOR_INTEGRITY'
  )),
  cooldown_seconds integer not null default 0 check (cooldown_seconds >= 0),
  health text,
  checked_at timestamptz,
  primary key (campaign_id, source_key)
);

create table if not exists cycle_winners (
  campaign_id text not null,
  cycle_id integer not null,
  position integer not null check (position between 1 and 5),
  telegram_user_id bigint not null,
  selection text not null check (
    (position between 1 and 2 and selection = 'auto_top2') or
    (position between 3 and 5 and selection = 'weighted_draw')
  ),
  draw_index integer,
  primary key (campaign_id, cycle_id, position),
  unique (campaign_id, cycle_id, telegram_user_id),
  foreign key (campaign_id, cycle_id) references cycles(campaign_id, cycle_id)
);

create table if not exists positions (
  campaign_id text not null references campaigns(id),
  reward_wallet text not null,
  eligible_bought_base_units numeric(39,0) not null default 0 check (eligible_bought_base_units >= 0),
  eligible_sold_base_units numeric(39,0) not null default 0 check (eligible_sold_base_units >= 0),
  net_buy_lamports bigint not null default 0,
  tier integer check (tier in (1,2)),
  weight integer not null default 0 check (weight in (0,1,3)),
  snapshot_usd numeric(20,9),
  eligible boolean not null default false,
  primary key (campaign_id, reward_wallet)
);

create table if not exists allocations (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  category text not null check (category in ('activity','buy_to_earn','diamond_duck')),
  cycle_id integer check (cycle_id between 1 and 5),
  telegram_user_id bigint,
  reward_wallet text not null,
  gross_base_units numeric(39,0) not null check (gross_base_units >= 0),
  calc_version integer not null check (calc_version > 0),
  manifest_version integer,
  eligibility_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists releases (
  id bigserial primary key,
  allocation_id bigint not null references allocations(id),
  pct integer not null check (pct between 1 and 100),
  scheduled_at timestamptz not null,
  amount_base_units numeric(39,0) not null check (amount_base_units >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','proposed','paid','failed','recovered','reserve')),
  payment_key text not null unique
);

create table if not exists manifests (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  category text not null check (category in ('activity','buy_to_earn','diamond_duck')),
  version integer not null check (version > 0),
  csv_hash text not null check (csv_hash ~ '^[0-9a-f]{64}$'),
  json_hash text not null check (json_hash ~ '^[0-9a-f]{64}$'),
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  supersedes integer,
  created_at timestamptz not null default now(),
  unique (campaign_id, category, version)
);

create table if not exists treasury_transactions (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  payment_key text not null references releases(payment_key),
  squads_proposal_ref text,
  tx_signature text,
  status text not null check (status in ('proposed','approved','executed','failed')),
  confirmed_block_time timestamptz,
  reconciliation_status text,
  created_at timestamptz not null default now(),
  unique (payment_key, tx_signature)
);

create unique index if not exists one_executed_treasury_payment
  on treasury_transactions(payment_key) where status = 'executed';

-- PostgreSQL does not create indexes for referencing foreign-key columns.
create index if not exists campaign_state_transitions_campaign_idx on campaign_state_transitions(campaign_id, created_at);
create index if not exists wallet_challenges_participant_idx on wallet_challenges(campaign_id, telegram_user_id, expires_at);
create index if not exists xp_ledger_participant_day_idx on xp_ledger(campaign_id, telegram_user_id, awarded_at);
create index if not exists xp_ledger_cycle_idx on xp_ledger(campaign_id, cycle_id, telegram_user_id);
create index if not exists campaign_raid_events_identity_idx on campaign_raid_events(campaign_id, x_user_id, received_at);
create index if not exists allocations_campaign_category_idx on allocations(campaign_id, category, cycle_id);
create index if not exists releases_allocation_idx on releases(allocation_id);
create index if not exists treasury_transactions_campaign_idx on treasury_transactions(campaign_id, created_at);

create table if not exists reserve_ledger (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  reason text not null check (reason in ('capped','fewer_than_five','unawarded','disqualified','failed_recovery','rounding')),
  amount_base_units numeric(39,0) not null check (amount_base_units >= 0),
  ref text,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  campaign_id text not null references campaigns(id),
  actor text not null check (actor in ('reviewer','operator','founder_a','founder_b','system')),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reserve_ledger_campaign_idx on reserve_ledger(campaign_id, created_at);
create index if not exists audit_log_campaign_idx on audit_log(campaign_id, created_at);

-- Immutable policy and financial ledgers: corrections are additive/versioned.
create or replace function reject_campaign_ledger_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception '% is append-only; write a new version/correction row', tg_table_name;
end;
$$;

drop trigger if exists ruleset_versions_immutable on ruleset_versions;
create trigger ruleset_versions_immutable before update or delete on ruleset_versions
for each row execute function reject_campaign_ledger_mutation();
drop trigger if exists deployment_registry_immutable on deployment_registry;
create trigger deployment_registry_immutable before update or delete on deployment_registry
for each row execute function reject_campaign_ledger_mutation();
drop trigger if exists xp_ledger_immutable on xp_ledger;
create trigger xp_ledger_immutable before update or delete on xp_ledger
for each row execute function reject_campaign_ledger_mutation();
drop trigger if exists reserve_ledger_immutable on reserve_ledger;
create trigger reserve_ledger_immutable before update or delete on reserve_ledger
for each row execute function reject_campaign_ledger_mutation();
drop trigger if exists campaign_state_transitions_immutable on campaign_state_transitions;
create trigger campaign_state_transitions_immutable before update or delete on campaign_state_transitions
for each row execute function reject_campaign_ledger_mutation();

create or replace view campaign_xp_totals with (security_invoker = on) as
select campaign_id, cycle_id, telegram_user_id, sum(amount)::bigint as xp
from xp_ledger group by campaign_id, cycle_id, telegram_user_id;

create or replace view campaign_registry_status with (security_invoker = on) as
select campaign_id, version, count(*)::integer as populated_fields,
       bool_and(value is not null and value <> '' and owner is not null and owner <> ''
         and evidence_url is not null and evidence_url <> '') as fully_evidenced,
       min(registry_hash) as registry_hash
from deployment_registry group by campaign_id, version;

-- Atomic state update. The application validates the transition graph and
-- evidence/signature policy first; the expected state prevents stale writers.
create or replace function transition_campaign_state(
  p_campaign_id text, p_expected_state text, p_next_state text,
  p_evidence jsonb, p_authorized_signers integer default 0,
  p_automatic_security_pause boolean default false
) returns campaigns language plpgsql security invoker set search_path = public as $$
declare result campaigns;
begin
  if p_evidence is null or p_evidence = '{}'::jsonb then raise exception 'exit evidence required'; end if;
  if p_expected_state = 'DRAFT' and p_next_state = 'READINESS_BLOCKED'
     and not (p_evidence ?& array['rulesHash','rulesetVersion']) then
    raise exception 'rules hash and ruleset version evidence required';
  end if;
  if p_expected_state = 'READINESS_BLOCKED' and p_next_state = 'FUNDED' then
    if not (p_evidence ?& array['fundedBaseUnits','expectedFundedBaseUnits','activationVaultBaseUnits',
      'scheduledVaultBaseUnits','solOperationsLamports','vaultsVerifiedAt']) then
      raise exception 'complete funding evidence required';
    end if;
    if (p_evidence->>'fundedBaseUnits')::numeric <> (p_evidence->>'expectedFundedBaseUnits')::numeric
       or (p_evidence->>'fundedBaseUnits')::numeric <>
          (p_evidence->>'activationVaultBaseUnits')::numeric + (p_evidence->>'scheduledVaultBaseUnits')::numeric
       or (p_evidence->>'scheduledVaultBaseUnits')::numeric <> 7 * (p_evidence->>'activationVaultBaseUnits')::numeric
       or (p_evidence->>'solOperationsLamports')::bigint <> 250000000 then
      raise exception 'funding evidence does not reconcile';
    end if;
  end if;
  if p_expected_state = 'FUNDED' and p_next_state = 'SCHEDULED'
     and not (p_evidence ?& array['registryHash','sourcesCertifiedAt','publicTimesPublishedAt']) then
    raise exception 'registry, source certification and public schedule evidence required';
  end if;
  if p_expected_state = 'SCHEDULED' and p_next_state = 'ACTIVE'
     and (not (p_evidence ?& array['readinessReportHash','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'readiness report and two founder approvals required';
  end if;
  if p_expected_state = 'ACTIVE' and p_next_state = 'VERIFYING'
     and not (p_evidence ?& array['campaignClosedAt','cutoffSlot']) then
    raise exception 'campaign close and cutoff evidence required';
  end if;
  if p_expected_state = 'VERIFYING' and p_next_state = 'ALLOCATIONS_FROZEN'
     and not (p_evidence ?& array['manifestHash','appealsClosedAt','verificationCompleteAt']) then
    raise exception 'manifest, appeals and verification evidence required';
  end if;
  if p_expected_state = 'ALLOCATIONS_FROZEN' and p_next_state = 'DISTRIBUTING'
     and (not (p_evidence ?& array['proposalRef','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'proposal and two founder approvals required';
  end if;
  if p_expected_state = 'DISTRIBUTING' and p_next_state = 'COMPLETED'
     and not (p_evidence ? 'reconciliationHash') then
    raise exception 'reconciliation evidence required';
  end if;
  if p_next_state = 'ARCHIVED'
     and (not (p_evidence ?& array['closeoutHash','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'closeout and two founder approvals required';
  end if;
  if not (
    (p_expected_state = 'DRAFT' and p_next_state = 'READINESS_BLOCKED') or
    (p_expected_state = 'READINESS_BLOCKED' and p_next_state = 'FUNDED') or
    (p_expected_state = 'FUNDED' and p_next_state = 'SCHEDULED') or
    (p_expected_state = 'SCHEDULED' and p_next_state = 'ACTIVE') or
    (p_expected_state = 'ACTIVE' and p_next_state = 'VERIFYING') or
    (p_expected_state = 'VERIFYING' and p_next_state = 'ALLOCATIONS_FROZEN') or
    (p_expected_state = 'ALLOCATIONS_FROZEN' and p_next_state = 'DISTRIBUTING') or
    (p_expected_state = 'DISTRIBUTING' and p_next_state = 'COMPLETED') or
    (p_expected_state = 'COMPLETED' and p_next_state = 'ARCHIVED') or
    (p_expected_state = 'TERMINATED' and p_next_state = 'ARCHIVED') or
    (p_next_state = 'PAUSED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING')) or
    (p_next_state = 'TERMINATED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING','PAUSED')) or
    (p_expected_state = 'PAUSED' and p_next_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING'))
  ) then raise exception 'invalid campaign state transition: % -> %', p_expected_state, p_next_state;
  end if;
  if p_next_state in ('PAUSED','TERMINATED')
     and not (p_next_state = 'PAUSED' and p_automatic_security_pause)
     and p_authorized_signers <> 2 then
    raise exception '% requires two authorized signers', p_next_state;
  end if;
  if p_expected_state = 'PAUSED' and p_next_state <> 'TERMINATED'
     and p_authorized_signers <> 2 then
    raise exception 'resuming requires two founder approvals';
  end if;
  update campaigns
    set state = p_next_state,
        resume_state = case
          when p_next_state = 'PAUSED' then p_expected_state
          when p_expected_state = 'PAUSED' then null
          else resume_state
        end,
        updated_at = now()
    where id = p_campaign_id
      and state = p_expected_state
      and (p_expected_state <> 'PAUSED' or p_next_state = 'TERMINATED' or resume_state = p_next_state)
    returning * into result;
  if not found then raise exception 'campaign state changed or campaign missing'; end if;
  insert into campaign_state_transitions
    (campaign_id, from_state, to_state, evidence, authorized_signers, automatic_security_pause)
  values (p_campaign_id, p_expected_state, p_next_state, p_evidence,
          p_authorized_signers, p_automatic_security_pause);
  return result;
end;
$$;

-- Functions in public receive EXECUTE for PUBLIC by default. Keep campaign
-- mutation RPCs server-side only; anon/authenticated receive no direct access.
revoke all on function reject_campaign_ledger_mutation() from public, anon, authenticated;
revoke all on function transition_campaign_state(text,text,text,jsonb,integer,boolean) from public, anon, authenticated;
grant execute on function transition_campaign_state(text,text,text,jsonb,integer,boolean) to service_role;

-- RLS-on/no policies: only the server-side service role may access these rows.
alter table campaigns enable row level security;
alter table ruleset_versions enable row level security;
alter table deployment_registry enable row level security;
alter table campaign_state_transitions enable row level security;
alter table identity_links enable row level security;
alter table wallet_challenges enable row level security;
alter table cycles enable row level security;
alter table xp_ledger enable row level security;
alter table campaign_raid_events enable row level security;
alter table verification_sources enable row level security;
alter table cycle_winners enable row level security;
alter table positions enable row level security;
alter table allocations enable row level security;
alter table releases enable row level security;
alter table manifests enable row level security;
alter table treasury_transactions enable row level security;
alter table reserve_ledger enable row level security;
alter table audit_log enable row level security;

revoke all on campaigns, ruleset_versions, deployment_registry,
  campaign_state_transitions, identity_links, wallet_challenges, cycles,
  xp_ledger, campaign_raid_events, verification_sources, cycle_winners,
  positions, allocations, releases, manifests, treasury_transactions,
  reserve_ledger, audit_log from anon, authenticated;
revoke all on campaign_xp_totals, campaign_registry_status from anon, authenticated;

-- Supabase's 2026 Data API defaults require deliberate grants. These objects
-- are bot-server-only: grant the service role exactly what the REST client
-- needs while leaving anon/authenticated denied and RLS enabled.
grant select, insert, update, delete on campaigns, ruleset_versions, deployment_registry,
  campaign_state_transitions, identity_links, wallet_challenges, cycles,
  xp_ledger, campaign_raid_events, verification_sources, cycle_winners,
  positions, allocations, releases, manifests, treasury_transactions,
  reserve_ledger, audit_log to service_role;
grant select on campaign_xp_totals, campaign_registry_status to service_role;
grant usage, select on sequence wallet_challenges_id_seq,
  campaign_state_transitions_id_seq, xp_ledger_id_seq,
  campaign_raid_events_id_seq, allocations_id_seq, releases_id_seq,
  manifests_id_seq, treasury_transactions_id_seq, reserve_ledger_id_seq,
  audit_log_id_seq to service_role;

-- Accept one positively verified Oracle action into the campaign ledger.
-- The bridge records proof as pending; a separate capped XP settlement step
-- decides whether and how much campaign XP to award.
create or replace function ingest_oracle_raid_event(
  p_campaign_id text,
  p_raid_id text,
  p_telegram_user_id bigint,
  p_x_user_id text,
  p_action text,
  p_tweet_id text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns campaign_raid_events
language plpgsql security invoker set search_path = public as $$
declare
  result campaign_raid_events;
  active_cycle integer;
begin
  select * into result from campaign_raid_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  if found then
    if result.raid_id is distinct from p_raid_id
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.x_user_id is distinct from p_x_user_id
      or result.action is distinct from p_action
      or result.tweet_id is distinct from p_tweet_id
      or result.verified_at is distinct from p_verified_at
    then
      raise exception 'idempotency key was reused with a different Oracle event';
    end if;
    return result;
  end if;

  if not exists (select 1 from campaigns where id = p_campaign_id and state = 'ACTIVE') then
    raise exception 'campaign is not active';
  end if;
  if not exists (
    select 1 from identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_user_id = p_x_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity does not match verified Oracle identity'; end if;

  select cycle_id into active_cycle from cycles
    where campaign_id = p_campaign_id
      and p_verified_at >= opens_at and p_verified_at < closes_at
    order by cycle_id limit 1;
  if active_cycle is null then raise exception 'verified action is outside an active cycle'; end if;

  insert into campaign_raid_events
    (campaign_id, cycle_id, raid_id, action, x_user_id, telegram_user_id,
     tweet_id, verified_at, idempotency_key, credited)
  values
    (p_campaign_id, active_cycle, p_raid_id, p_action, p_x_user_id,
     p_telegram_user_id, p_tweet_id, p_verified_at, p_idempotency_key, false)
  on conflict (campaign_id, idempotency_key) do nothing
  returning * into result;
  if result.id is null then
    select * into result from campaign_raid_events
      where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  end if;
  return result;
end;
$$;

revoke all on function ingest_oracle_raid_event(text,text,bigint,text,text,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function ingest_oracle_raid_event(text,text,bigint,text,text,text,timestamptz,text)
  to service_role;
