-- Replace the stale, fixed-date seven-cycle Bond rules validator with a
-- schedule-relative five-cycle validator. This migration creates no proposal,
-- decision or finalization and does not change campaign state or move funds.

alter function public.validate_bond_campaign_final_rules(jsonb,text,integer)
  rename to validate_bond_campaign_final_rules_legacy_seven_cycle;

create function public.validate_bond_campaign_final_rules(
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
begin
  if p_rules is null or jsonb_typeof(p_rules) is distinct from 'object'
    or p_rules#>>'{schedule,timeZone}' is distinct from 'America/Vancouver'
    or p_rules#>>'{schedule,activeDays}' is distinct from '10'
    or p_rules#>>'{schedule,cycleHours}' is distinct from '48'
    or p_rules#>>'{schedule,cycleCount}' is distinct from '5'
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

  -- Reuse the already-audited legacy validator for every non-schedule rule.
  -- Only the fields it historically fixed to the retired launch calendar are
  -- normalized; all commitments, missions, sources, releases, referrals and
  -- Earn-to-Burn constraints continue to be checked by the original function.
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

-- The unnamed function check was bound to the legacy function OID when that
-- function was renamed. Rebind it to the new validator without touching rows.
alter table public.campaign_ruleset_proposals
  drop constraint if exists campaign_ruleset_proposals_check;
alter table public.campaign_ruleset_proposals
  add constraint campaign_ruleset_proposals_rules_valid_check
  check (public.validate_bond_campaign_final_rules(rules_json, campaign_id, version))
  not valid;

revoke all on function public.validate_bond_campaign_final_rules(jsonb,text,integer)
  from public, anon, authenticated;
revoke all on function public.validate_bond_campaign_final_rules_legacy_seven_cycle(jsonb,text,integer)
  from public, anon, authenticated;
grant execute on function public.validate_bond_campaign_final_rules(jsonb,text,integer),
  public.validate_bond_campaign_final_rules_legacy_seven_cycle(jsonb,text,integer)
  to service_role;
