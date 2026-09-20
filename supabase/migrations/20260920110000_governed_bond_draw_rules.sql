-- Govern Bond cycle draw mechanics inside final-rules validation.
-- Keeps the existing five-cycle validator and adds an exact deterministic
-- draw-policy invariant. No proposals, dates, approvals, or campaign state change.

create or replace function public.validate_bond_campaign_final_rules(
  p_rules jsonb,
  p_campaign_id text,
  p_version integer
) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare
  normalized_rules jsonb;
  active_opens_at timestamptz;
  active_closes_at timestamptz;
  review_opens_at timestamptz;
  review_checkpoint_at timestamptz;
  review_closes_at timestamptz;
  expected_draw constant jsonb := '{
    "protocolVersion":"bond-draw-v1",
    "commitmentHash":"SHA-256",
    "commitmentDomain":"bond-draw-commit-v1",
    "commitmentCount":5,
    "commitBeforeCycleOpen":true,
    "allCommitmentsBeforeActivation":true,
    "cutoffRule":"FIRST_FINALIZED_SOLANA_BLOCK_AT_OR_AFTER_CYCLE_CLOSE",
    "previousFinalizedBlockRequired":true,
    "revealWindowMinutes":30,
    "revealAffectsSeed":false,
    "fallbackPolicy":"SAME_SEED_MARK_FALLBACK_IF_REVEAL_MISSING_OR_LATE",
    "seedHash":"SHA-256",
    "seedDomain":"bond-draw-seed-v1",
    "seedInputs":["campaignId","cycleId","commitHash","cutoffSlot","cutoffBlockhash"],
    "weightedDrawPool":"RANKS_3_TO_15",
    "priorWinnerCooldownCycles":1
  }'::jsonb;
begin
  if p_rules is null or jsonb_typeof(p_rules) is distinct from 'object'
    or p_rules#>>'{schedule,timeZone}' is distinct from 'America/Vancouver'
    or p_rules#>>'{schedule,activeDays}' is distinct from '10'
    or p_rules#>>'{schedule,cycleHours}' is distinct from '48'
    or p_rules#>>'{schedule,cycleCount}' is distinct from '5'
    or p_rules->'draw' is distinct from expected_draw
  then return false; end if;

  active_opens_at := (p_rules#>>'{schedule,activeOpensAt}')::timestamptz;
  active_closes_at := (p_rules#>>'{schedule,activeClosesAt}')::timestamptz;
  review_opens_at := (p_rules#>>'{schedule,reviewOpensAt}')::timestamptz;
  review_checkpoint_at := (p_rules#>>'{schedule,review48HourCheckpointAt}')::timestamptz;
  review_closes_at := (p_rules#>>'{schedule,reviewClosesAt}')::timestamptz;

  if active_closes_at <> active_opens_at + interval '10 days'
    or review_opens_at <> active_closes_at + interval '1 day'
    or review_checkpoint_at <> review_opens_at + interval '48 hours'
    or review_closes_at <> review_opens_at + interval '72 hours'
  then return false; end if;

  normalized_rules := jsonb_set(p_rules, '{schedule,activeOpensAt}', '"2026-09-01T15:00:00.000Z"'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,activeClosesAt}', '"2026-09-15T15:00:00.000Z"'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,reviewOpensAt}', '"2026-09-16T15:00:00.000Z"'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,review48HourCheckpointAt}', '"2026-09-18T15:00:00.000Z"'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,reviewClosesAt}', '"2026-09-19T15:00:00.000Z"'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,activeDays}', '14'::jsonb);
  normalized_rules := jsonb_set(normalized_rules, '{schedule,cycleCount}', '7'::jsonb);

  return public.validate_bond_campaign_final_rules_legacy_seven_cycle(
    normalized_rules, p_campaign_id, p_version
  );
exception when others then
  return false;
end;
$$;

revoke all on function public.validate_bond_campaign_final_rules(jsonb,text,integer)
  from public, anon, authenticated;
grant execute on function public.validate_bond_campaign_final_rules(jsonb,text,integer)
  to service_role;
