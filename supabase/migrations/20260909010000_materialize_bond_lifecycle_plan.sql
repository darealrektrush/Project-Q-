-- Atomically materialize the reviewed Bond lifecycle plan. This migration
-- installs schema and a service-only RPC; it does not call the RPC, change
-- campaign state, fund a vault, create a proposal, sign, or move tokens.

alter table public.allocations
  add column if not exists allocation_key text;

create unique index if not exists allocations_campaign_allocation_key_uidx
  on public.allocations(campaign_id, allocation_key)
  where allocation_key is not null;

create table if not exists public.campaign_materializations (
  campaign_id text primary key references public.campaigns(id),
  schema_version text not null check (schema_version = 'bond-lifecycle-materialization-v1'),
  plan_hash text not null unique check (plan_hash ~ '^[0-9a-f]{64}$'),
  plan_payload jsonb not null check (jsonb_typeof(plan_payload) = 'object'),
  calc_version integer not null check (calc_version > 0),
  manifest_version integer not null check (manifest_version > 0),
  winner_count integer not null check (winner_count = 25),
  allocation_count integer not null check (allocation_count = 25),
  release_count integer not null check (release_count = 175),
  allocated_base_units numeric(39,0) not null check (allocated_base_units = 15000000000000),
  scheduled_base_units numeric(39,0) not null check (scheduled_base_units = 15000000000000),
  created_at timestamptz not null default now()
);

alter table public.campaign_materializations enable row level security;
revoke all on public.campaign_materializations from public, anon, authenticated;
grant select, insert on public.campaign_materializations to service_role;

drop trigger if exists campaign_materializations_immutable
  on public.campaign_materializations;
create trigger campaign_materializations_immutable
before update or delete on public.campaign_materializations
for each row execute function public.reject_immutable_burn_ledger_mutation();

create or replace function public.materialize_bond_lifecycle_plan(
  p_plan jsonb,
  p_plan_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = public as $$
declare
  campaign_row public.campaigns;
  rules_row public.ruleset_versions;
  existing_row public.campaign_materializations;
  winner_count integer;
  allocation_count integer;
  release_count integer;
  allocated_total numeric(39,0);
  scheduled_total numeric(39,0);
begin
  if p_plan is null or jsonb_typeof(p_plan) is distinct from 'object'
    or p_plan_hash is null or p_plan_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid lifecycle materialization envelope';
  end if;

  if p_plan->>'schema' is distinct from 'bond-lifecycle-materialization-v1'
    or p_plan->>'campaignId' is distinct from 'bond-the-duck-2026'
    or p_plan->>'expectedCampaignState' is distinct from 'VERIFYING'
    or p_plan->>'mode' is distinct from 'BUILD_ONLY_NO_DATABASE_NO_SIGNING'
    or p_plan->>'allocatedBaseUnits' is distinct from '15000000000000'
    or p_plan->>'scheduledBaseUnits' is distinct from '15000000000000'
    or coalesce((p_plan->>'calcVersion')::integer, 0) < 1
    or coalesce((p_plan->>'manifestVersion')::integer, 0) < 1
  then
    raise exception 'lifecycle plan does not match the Bond contract';
  end if;

  if jsonb_typeof(p_plan->'winnerRows') is distinct from 'array'
    or jsonb_typeof(p_plan->'allocationRows') is distinct from 'array'
    or jsonb_typeof(p_plan->'releaseRows') is distinct from 'array'
    or jsonb_array_length(p_plan->'winnerRows') <> 25
    or jsonb_array_length(p_plan->'allocationRows') <> 25
    or jsonb_array_length(p_plan->'releaseRows') <> 175
  then
    raise exception 'lifecycle plan row counts are incomplete';
  end if;

  perform pg_advisory_xact_lock(hashtext('bond-the-duck-2026:materialization'));

  select * into campaign_row
  from public.campaigns
  where id = 'bond-the-duck-2026'
  for update;

  if not found or campaign_row.state <> 'VERIFYING' then
    raise exception 'Bond must be VERIFYING before materialization';
  end if;

  select * into rules_row
  from public.ruleset_versions
  where campaign_id = campaign_row.id
    and version = campaign_row.ruleset_version;

  if not found
    or rules_row.rules_hash <> campaign_row.rules_hash
    or rules_row.rules_json->>'status' <> 'FINAL'
    or rules_row.rules_json#>>'{schedule,activeDays}' <> '10'
    or rules_row.rules_json#>>'{schedule,cycleHours}' <> '48'
    or rules_row.rules_json#>>'{schedule,cycleCount}' <> '5'
    or rules_row.rules_json#>>'{commitments,campaignRewardsBaseUnits}' <> '15000000000000'
    or rules_row.rules_json#>>'{releases,verifiedActivityPercent}' <> '25'
    or rules_row.rules_json#>>'{releases,postReviewPercent}' <> '50'
    or rules_row.rules_json#>>'{releases,phasedPercent}' <> '25'
    or rules_row.rules_json#>>'{releases,phasedInstallments}' <> '5'
  then
    raise exception 'FINAL campaign rules do not authorize materialization';
  end if;

  select * into existing_row
  from public.campaign_materializations
  where campaign_id = campaign_row.id;

  if found then
    if existing_row.plan_hash <> p_plan_hash or existing_row.plan_payload <> p_plan then
      raise exception 'conflicting lifecycle materialization already exists';
    end if;
    if (select count(*) from public.cycle_winners where campaign_id = campaign_row.id) <> 25
      or (select count(*) from public.allocations where campaign_id = campaign_row.id) <> 25
      or (select count(*) from public.releases r join public.allocations a on a.id = r.allocation_id where a.campaign_id = campaign_row.id) <> 175
    then
      raise exception 'stored lifecycle materialization is incomplete';
    end if;
    return jsonb_build_object(
      'campaignId', campaign_row.id, 'planHash', p_plan_hash,
      'winnerCount', 25, 'allocationCount', 25, 'releaseCount', 175,
      'allocatedBaseUnits', '15000000000000', 'replayed', true
    );
  end if;

  if exists (select 1 from public.cycle_winners where campaign_id = campaign_row.id)
    or exists (select 1 from public.allocations where campaign_id = campaign_row.id)
    or exists (
      select 1 from public.releases r
      join public.allocations a on a.id = r.allocation_id
      where a.campaign_id = campaign_row.id
    )
  then
    raise exception 'refusing to materialize over existing campaign rows';
  end if;

  create temporary table bond_winners on commit drop as
  select * from jsonb_to_recordset(p_plan->'winnerRows') as x(
    campaign_id text, cycle_id integer, position integer,
    telegram_user_id bigint, selection text, draw_index integer
  );
  create temporary table bond_allocations on commit drop as
  select * from jsonb_to_recordset(p_plan->'allocationRows') as x(
    allocation_key text, campaign_id text, category text, cycle_id integer,
    telegram_user_id bigint, reward_wallet text, gross_base_units numeric(39,0),
    calc_version integer, manifest_version integer, eligibility_status text
  );
  create temporary table bond_releases on commit drop as
  select * from jsonb_to_recordset(p_plan->'releaseRows') as x(
    allocation_key text, pct integer, scheduled_at timestamptz,
    amount_base_units numeric(39,0), status text, payment_key text
  );

  select count(*) into winner_count from bond_winners;
  select count(*), coalesce(sum(gross_base_units), 0)
    into allocation_count, allocated_total from bond_allocations;
  select count(*), coalesce(sum(amount_base_units), 0)
    into release_count, scheduled_total from bond_releases;

  if winner_count <> 25 or allocation_count <> 25 or release_count <> 175
    or allocated_total <> 15000000000000 or scheduled_total <> 15000000000000
  then
    raise exception 'materialized rows do not reconcile to the Bond contract';
  end if;

  if exists (
    select 1 from bond_winners
    where campaign_id <> campaign_row.id or cycle_id not between 1 and 5
      or position not between 1 and 5
      or (position between 1 and 2 and selection <> 'auto_top2')
      or (position between 3 and 5 and selection <> 'weighted_draw')
      or (position between 1 and 2 and draw_index is not null)
      or (position between 3 and 5 and draw_index <> position - 2)
  ) or exists (
    select 1 from bond_winners group by campaign_id, cycle_id, position having count(*) <> 1
  ) or exists (
    select 1 from bond_winners group by campaign_id, cycle_id, telegram_user_id having count(*) <> 1
  ) then
    raise exception 'winner rows are invalid or duplicated';
  end if;

  if exists (
    select 1
    from bond_allocations a
    left join bond_winners w on w.campaign_id = a.campaign_id
      and w.cycle_id = a.cycle_id and w.telegram_user_id = a.telegram_user_id
    left join public.identity_links i on i.campaign_id = a.campaign_id
      and i.telegram_user_id = a.telegram_user_id
    where a.campaign_id <> campaign_row.id or a.category <> 'activity'
      or a.cycle_id not between 1 and 5 or a.gross_base_units <= 0
      or a.calc_version <> (p_plan->>'calcVersion')::integer
      or a.manifest_version <> (p_plan->>'manifestVersion')::integer
      or a.eligibility_status <> 'FINAL_VERIFIED'
      or a.allocation_key <> format('cycle-%s:position-%s', a.cycle_id, w.position)
      or w.telegram_user_id is null
      or i.reward_wallet is distinct from a.reward_wallet
      or i.wallet_verified_at is null or i.x_verified_at is null
      or i.fawkq_token_account is null
  ) or exists (
    select 1 from bond_allocations group by allocation_key having count(*) <> 1
  ) then
    raise exception 'allocation rows are not bound to verified winners and wallets';
  end if;

  if exists (
    select 1 from bond_releases
    where allocation_key is null or payment_key is null or scheduled_at is null
      or pct not in (25, 50, 5) or amount_base_units <= 0
      or status <> 'scheduled'
      or payment_key not in (
        format('%s:activity:%s:verified-25', campaign_row.id, allocation_key),
        format('%s:activity:%s:post-review-50', campaign_row.id, allocation_key),
        format('%s:activity:%s:phased-05-1', campaign_row.id, allocation_key),
        format('%s:activity:%s:phased-05-2', campaign_row.id, allocation_key),
        format('%s:activity:%s:phased-05-3', campaign_row.id, allocation_key),
        format('%s:activity:%s:phased-05-4', campaign_row.id, allocation_key),
        format('%s:activity:%s:phased-05-5', campaign_row.id, allocation_key)
      )
  ) or exists (
    select 1 from bond_releases group by payment_key having count(*) <> 1
  ) or exists (
    select 1
    from bond_releases r
    left join bond_allocations a using (allocation_key)
    where a.allocation_key is null
  ) or exists (
    select 1
    from bond_releases r
    join bond_allocations a using (allocation_key)
    group by r.allocation_key, a.gross_base_units
    having count(*) <> 7 or sum(r.pct) <> 100
      or sum(r.amount_base_units) <> a.gross_base_units
      or count(*) filter (where r.pct = 25) <> 1
      or count(*) filter (where r.pct = 50) <> 1
      or count(*) filter (where r.pct = 5) <> 5
  ) then
    raise exception 'release rows are invalid or do not reconcile by allocation';
  end if;

  insert into public.cycle_winners (
    campaign_id, cycle_id, position, telegram_user_id, selection, draw_index
  ) select campaign_id, cycle_id, position, telegram_user_id, selection, draw_index
    from bond_winners order by cycle_id, position;

  insert into public.allocations (
    allocation_key, campaign_id, category, cycle_id, telegram_user_id,
    reward_wallet, gross_base_units, calc_version, manifest_version, eligibility_status
  ) select allocation_key, campaign_id, category, cycle_id, telegram_user_id,
      reward_wallet, gross_base_units, calc_version, manifest_version, eligibility_status
    from bond_allocations order by cycle_id, allocation_key;

  insert into public.releases (
    allocation_id, pct, scheduled_at, amount_base_units, status, payment_key
  ) select a.id, r.pct, r.scheduled_at, r.amount_base_units, r.status, r.payment_key
    from bond_releases r
    join public.allocations a on a.campaign_id = campaign_row.id
      and a.allocation_key = r.allocation_key
    order by r.scheduled_at, r.payment_key;

  insert into public.campaign_materializations (
    campaign_id, schema_version, plan_hash, plan_payload, calc_version,
    manifest_version, winner_count, allocation_count, release_count,
    allocated_base_units, scheduled_base_units
  ) values (
    campaign_row.id, p_plan->>'schema', p_plan_hash, p_plan,
    (p_plan->>'calcVersion')::integer, (p_plan->>'manifestVersion')::integer,
    winner_count, allocation_count, release_count, allocated_total, scheduled_total
  );

  return jsonb_build_object(
    'campaignId', campaign_row.id, 'planHash', p_plan_hash,
    'winnerCount', winner_count, 'allocationCount', allocation_count,
    'releaseCount', release_count, 'allocatedBaseUnits', allocated_total::text,
    'replayed', false
  );
end;
$$;

revoke all on function public.materialize_bond_lifecycle_plan(jsonb,text)
  from public, anon, authenticated;
grant execute on function public.materialize_bond_lifecycle_plan(jsonb,text)
  to service_role;
