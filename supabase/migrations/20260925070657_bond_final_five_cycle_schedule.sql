-- Install a service-only schedule operation. Installing this migration does not
-- move any existing cycle, select a launch date or change campaign state.
-- The operation is callable only after the two-founder FINAL rules workflow.

alter table public.cycles drop constraint if exists bond_cycles_max_five_check;
alter table public.cycles add constraint bond_cycles_max_five_check
  check (campaign_id <> 'bond-the-duck-2026' or cycle_id between 1 and 5) not valid;

create or replace function public.schedule_bond_final_cycles(
  p_campaign_id text,
  p_rules_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  rules_row public.ruleset_versions;
  opens_at_value timestamptz;
  existing_count integer;
  matches_final integer;
begin
  if p_campaign_id is distinct from 'bond-the-duck-2026'
    or p_rules_hash is null or p_rules_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid Bond final schedule request'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bond-the-duck-2026:final-schedule'));
  select * into campaign_row from public.campaigns
  where id = p_campaign_id for update;
  if not found or campaign_row.state not in ('DRAFT','READINESS_BLOCKED')
    or campaign_row.rules_hash is distinct from p_rules_hash
  then raise exception 'Bond final schedule requires matching draft campaign rules'; end if;

  select * into rules_row from public.ruleset_versions
  where campaign_id = p_campaign_id and version = campaign_row.ruleset_version;
  if not found or rules_row.rules_hash is distinct from p_rules_hash
    or rules_row.rules_json->>'status' is distinct from 'FINAL'
    or not public.validate_bond_campaign_final_rules(
      rules_row.rules_json, p_campaign_id, campaign_row.ruleset_version
    )
  then raise exception 'Bond final schedule requires approved FINAL five-cycle rules'; end if;

  opens_at_value := (rules_row.rules_json#>>'{schedule,activeOpensAt}')::timestamptz;
  if opens_at_value <= pg_catalog.clock_timestamp() then
    raise exception 'Bond final schedule start must be in the future';
  end if;

  select count(*), count(*) filter (where
    cycle_id between 1 and 5
    and opens_at = opens_at_value + (cycle_id - 1) * interval '48 hours'
    and closes_at = opens_at_value + cycle_id * interval '48 hours'
    and allocation_base_units = 0
  ) into existing_count, matches_final
  from public.cycles where campaign_id = p_campaign_id;
  if existing_count = 5 and matches_final = 5 then
    return jsonb_build_object('campaignId',p_campaign_id,'cycleCount',5,
      'rulesHash',p_rules_hash,'replayed',true);
  end if;

  if exists (select 1 from public.cycles where campaign_id=p_campaign_id and (
      finalized_at is not null or cutoff_slot is not null or cutoff_blockhash is not null
      or commit_hash is not null or reveal_value is not null or fallback_used
      or allocation_base_units <> 0
    ))
    or exists (select 1 from public.allocations where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_bagwork_events where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_buy_to_earn_events where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_cycle_draw_commitments where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_cycle_draw_cutoffs where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_cycle_draw_finalizations where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_cycle_draw_reveals where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_participation_events where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_raid_events where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_xp_exports where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_xp_totals where campaign_id=p_campaign_id)
    or exists (select 1 from public.cycle_winners where campaign_id=p_campaign_id)
    or exists (select 1 from public.xp_ledger where campaign_id=p_campaign_id)
    or exists (select 1 from public.campaign_materializations where campaign_id=p_campaign_id)
  then raise exception 'refusing to replace Bond cycles after campaign evidence exists'; end if;

  -- The foreign keys on the cycle table also reject any undiscovered references.
  delete from public.cycles where campaign_id = p_campaign_id;
  insert into public.cycles(campaign_id,cycle_id,opens_at,closes_at,allocation_base_units)
    select p_campaign_id,n,
      opens_at_value + (n - 1) * interval '48 hours',
      opens_at_value + n * interval '48 hours',0
    from pg_catalog.generate_series(1,5) n;

  return jsonb_build_object('campaignId',p_campaign_id,'cycleCount',5,
    'rulesHash',p_rules_hash,'replayed',false);
end;
$$;

revoke all on function public.schedule_bond_final_cycles(text,text)
  from public, anon, authenticated;
grant execute on function public.schedule_bond_final_cycles(text,text)
  to service_role;
