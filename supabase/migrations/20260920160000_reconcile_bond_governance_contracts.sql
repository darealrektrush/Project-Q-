-- Reconcile Bond the Duck live governance contracts with the locked five-cycle design.
-- This migration changes validation/transition logic only. It does not change
-- campaign state, dates, funding balances, draw rows, rulesets, or rewards.

create or replace function public.validate_bond_campaign_final_rules(
  p_rules jsonb,
  p_campaign_id text,
  p_version integer
) returns boolean
language plpgsql
immutable
set search_path = '' as $$
declare
  active_opens_at timestamptz;
  active_closes_at timestamptz;
  review_opens_at timestamptz;
  review_checkpoint_at timestamptz;
  review_closes_at timestamptz;
  milestone_count integer;
  milestone_total numeric;
  milestone_targets numeric[];
  website_keys text[];
  website_accepting_count integer;
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
    or p_campaign_id is distinct from 'bond-the-duck-2026'
    or p_version is null or p_version < 1
    or p_rules->>'schema' is distinct from 'bond-campaign-rules-v1'
    or p_rules->>'campaignId' is distinct from p_campaign_id
    or p_rules->>'status' is distinct from 'FINAL'
    or coalesce(p_rules->>'rulesetVersion','') !~ '^[1-9][0-9]*$'
    or (p_rules->>'rulesetVersion')::integer is distinct from p_version
  then return false; end if;

  if p_rules#>>'{schedule,timeZone}' is distinct from 'America/Vancouver'
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

  if p_rules->'draw' is distinct from expected_draw then return false; end if;

  if p_rules#>>'{commitments,campaignRewardsBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{commitments,diamondDuckBaseUnits}' is distinct from '2500000000000'
    or p_rules#>>'{commitments,squadsCommunityVaultBaseUnits}' is distinct from '17500000000000'
    or p_rules#>>'{commitments,campaignRewardsSource}' is distinct from 'SQUADS_COMMUNITY_VAULT'
    or p_rules#>>'{commitments,diamondDuckSource}' is distinct from 'SQUADS_COMMUNITY_VAULT'
    or p_rules#>>'{commitments,squadsApprovalThreshold}' is distinct from '2'
    or p_rules#>>'{commitments,squadsMemberCount}' is distinct from '3'
    or p_rules#>>'{commitments,unlockDependent}' is distinct from 'false'
    or p_rules#>>'{commitments,topContributorLamports}' is distinct from '1000000000'
    or p_rules#>>'{commitments,earnToBurnBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{commitments,earnToBurnSource}' is distinct from 'FAWKQ_CREATOR_WALLET'
    or p_rules#>>'{commitments,totalTokenCommitmentBaseUnits}' is distinct from '32500000000000'
  then return false; end if;

  if p_rules->'missions' is distinct from
    '["oracle-raids","website-voting","trending-bots","bagwork","buy-to-earn","participation-xp","community-pulse","verified-referrals","earn-to-burn"]'::jsonb
    or p_rules#>>'{eligibility,telegramRequired}' is distinct from 'true'
    or p_rules#>>'{eligibility,oracleXRequired}' is distinct from 'true'
    or p_rules#>>'{eligibility,walletRequiredForRewards}' is distinct from 'true'
    or p_rules#>>'{eligibility,minimumFawkqUsd}' is distinct from '2'
    or p_rules#>>'{xpCaps,overallDaily}' is distinct from '75'
    or p_rules#>>'{xpCaps,participationDaily}' is distinct from '15'
    or p_rules#>>'{xpCaps,projectQDaily}' is distinct from '20'
    or p_rules#>>'{xpCaps,trendingBotsDaily}' is distinct from '20'
  then return false; end if;

  if p_rules#>>'{verificationSources,websiteVotingCount}' is distinct from '9'
    or jsonb_typeof(p_rules#>'{verificationSources,websiteVoting}') is distinct from 'array'
    or jsonb_array_length(p_rules#>'{verificationSources,websiteVoting}') <> 9
  then return false; end if;

  select array_agg(value order by value),
         count(*) filter (where elem->>'individualXpEligible' = 'true')
  into website_keys, website_accepting_count
  from (
    select elem, elem->>'sourceKey' value
    from jsonb_array_elements(p_rules#>'{verificationSources,websiteVoting}') elem
  ) q;

  if website_keys is distinct from array[
    'web:coinboom','web:coinbuzzer','web:coinmooner','web:coinmun','web:coinscope',
    'web:coinsniper','web:geckoterminal','web:gemfinder','web:top100token'
  ]::text[]
    or website_accepting_count <> 3
    or p_rules#>>'{verificationSources,telegramBotFirstDailyXp}' is distinct from '2'
    or p_rules#>>'{verificationSources,telegramBotRepeatXp}' is distinct from '1'
    or p_rules#>>'{verificationSources,telegramBotDailyMaximumXp}' is distinct from '20'
    or p_rules#>>'{verificationSources,telegramPushPointPerAcceptedVote}' is distinct from '1'
    or p_rules#>'{verificationSources,telegramBots}' is distinct from
      '["@majorbuybot","@wtftrending","@trenchobot","@BBtrendingbot","@drokiatrendsbot"]'::jsonb
  then return false; end if;

  if p_rules#>>'{releases,verifiedActivityPercent}' is distinct from '25'
    or p_rules#>>'{releases,postReviewPercent}' is distinct from '50'
    or p_rules#>>'{releases,phasedPercent}' is distinct from '25'
    or p_rules#>>'{releases,phasedInstallments}' is distinct from '5'
    or p_rules#>>'{releases,phasedInstallmentPercent}' is distinct from '5'
    or p_rules#>'{releases,phasedOffsetDays}' is distinct from '[6,12,18,24,30]'::jsonb
  then return false; end if;

  if p_rules#>>'{referrals,minimumPurchaseUsd}' is distinct from '2'
    or p_rules#>>'{referrals,bonusXp}' is distinct from '10'
    or p_rules#>>'{referrals,bonusCapPolicy}' is distinct from 'QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP'
    or coalesce(p_rules#>>'{referrals,xInviteMainPostId}','') !~ '^[0-9]{1,24}$'
    or p_rules#>>'{referrals,xInviteRequiredDistinctMentions}' is distinct from '3'
    or p_rules#>>'{referrals,xInviteBonusXp}' is distinct from '5'
  then return false; end if;

  if p_rules#>>'{earnToBurn,programId}' is distinct from 'fawkq-earn-to-burn'
    or p_rules#>>'{earnToBurn,openingBurnBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{earnToBurn,openingBurnType}' is distinct from 'CREATOR_WALLET_RESERVE'
    or jsonb_typeof(p_rules#>'{earnToBurn,milestones}') is distinct from 'array'
    or jsonb_array_length(p_rules#>'{earnToBurn,milestones}') <> 5
  then return false; end if;

  select count(*)::integer,
         sum((elem->>'burnAmountBaseUnits')::numeric),
         array_agg((elem->>'progressTargetUnits')::numeric order by ordinality)
  into milestone_count, milestone_total, milestone_targets
  from jsonb_array_elements(p_rules#>'{earnToBurn,milestones}')
    with ordinality as item(elem, ordinality);

  if milestone_count <> 5
    or milestone_total <> 15000000000000
    or milestone_targets is distinct from array[2000,5000,9000,14000,20000]::numeric[]
  then return false; end if;

  if jsonb_typeof(p_rules->'buyToEarn') is distinct from 'object'
    or p_rules#>>'{buyToEarn,mode}' not in ('WEIGHT_ONLY','SEPARATE_POOL')
    or (p_rules#>>'{buyToEarn,tier1NetBuySol}')::numeric <> 0.07
    or (p_rules#>>'{buyToEarn,tier2NetBuySol}')::numeric <> 0.20
  then return false; end if;

  if p_rules#>>'{buyToEarn,mode}' = 'WEIGHT_ONLY' then
    if coalesce(p_rules#>>'{buyToEarn,poolBaseUnits}','0') <> '0' then return false; end if;
  else
    if coalesce(p_rules#>>'{buyToEarn,poolBaseUnits}','') !~ '^[1-9][0-9]*$'
      or coalesce(p_rules#>>'{buyToEarn,fundingSource}','') = ''
    then return false; end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.transition_campaign_state(
  p_campaign_id text,
  p_expected_state text,
  p_next_state text,
  p_evidence jsonb,
  p_authorized_signers integer default 0,
  p_automatic_security_pause boolean default false
) returns public.campaigns
language plpgsql
security invoker
set search_path = '' as $$
declare
  result public.campaigns;
  campaign_row public.campaigns;
  commitment_count integer;
  cycle_count integer;
begin

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for update;
  if not found then raise exception 'campaign missing'; end if;
  if p_evidence is null or p_evidence = '{}'::jsonb then
    raise exception 'exit evidence required';
  end if;

  if p_expected_state = 'DRAFT' and p_next_state = 'READINESS_BLOCKED'
    and not (p_evidence ?& array['rulesHash','rulesetVersion'])
  then raise exception 'rules hash and ruleset version evidence required'; end if;

  if p_expected_state = 'READINESS_BLOCKED' and p_next_state = 'FUNDED' then
    if not (p_evidence ?& array[
      'fundedBaseUnits','expectedFundedBaseUnits','squadsCommunityVaultBaseUnits',
      'squadsApprovalThreshold','squadsMemberCount','topContributorPrizeLamports','vaultVerifiedAt'
    ]) then
      raise exception 'complete funding evidence required';
    end if;
    if campaign_row.funded_base_units <> 17500000000000
      or (p_evidence->>'fundedBaseUnits')::numeric <> campaign_row.funded_base_units
      or (p_evidence->>'fundedBaseUnits')::numeric <> 17500000000000
      or (p_evidence->>'expectedFundedBaseUnits')::numeric <> 17500000000000
      or (p_evidence->>'squadsCommunityVaultBaseUnits')::numeric <> 17500000000000
      or (p_evidence->>'squadsApprovalThreshold')::integer <> 2
      or (p_evidence->>'squadsMemberCount')::integer <> 3
      or (p_evidence->>'topContributorPrizeLamports')::bigint <> 1000000000
    then raise exception 'funding evidence does not reconcile'; end if;
  end if;

  if p_expected_state = 'FUNDED' and p_next_state = 'SCHEDULED' then
    if not (p_evidence ?& array['registryHash','sourcesCertifiedAt','publicTimesPublishedAt']) then
      raise exception 'registry, source certification and public schedule evidence required';
    end if;
    if campaign_row.registry_version is null then
      raise exception 'selected deployment registry version is required before scheduling';
    end if;
    select count(*) into cycle_count
    from public.cycles
    where campaign_id = p_campaign_id;
    if p_campaign_id = 'bond-the-duck-2026' and cycle_count <> 5 then
      raise exception 'Bond scheduling requires exactly five campaign cycles';
    end if;
  end if;

  if p_expected_state = 'SCHEDULED' and p_next_state = 'ACTIVE' then
    if not (p_evidence ?& array['readinessReportVersion','readinessReportHash','founderApprovals'])
      or (p_evidence->>'founderApprovals')::integer <> 2
      or coalesce(p_evidence->>'readinessReportVersion','') = ''
      or coalesce(p_evidence->>'readinessReportHash','') !~ '^[0-9a-f]{64}$'
    then
      raise exception 'versioned readiness report and two founder approvals required';
    end if;

    if p_campaign_id = 'bond-the-duck-2026' then
      select count(*) into commitment_count
      from public.campaign_cycle_draw_commitments
      where campaign_id = p_campaign_id;
      if commitment_count <> 5 then
        raise exception 'Bond activation requires all five pre-open draw commitments';
      end if;
    end if;
  end if;

  if p_expected_state = 'ACTIVE' and p_next_state = 'VERIFYING'
    and not (p_evidence ?& array['campaignClosedAt','cutoffSlot'])
  then raise exception 'campaign close and cutoff evidence required'; end if;

  if p_expected_state = 'VERIFYING' and p_next_state = 'ALLOCATIONS_FROZEN'
    and not (p_evidence ?& array['manifestHash','appealsClosedAt','verificationCompleteAt'])
  then raise exception 'manifest, appeals and verification evidence required'; end if;

  if p_expected_state = 'ALLOCATIONS_FROZEN' and p_next_state = 'DISTRIBUTING'
    and (not (p_evidence ?& array['proposalRef','founderApprovals'])
      or (p_evidence->>'founderApprovals')::integer <> 2)
  then raise exception 'proposal and two founder approvals required'; end if;

  if p_expected_state = 'DISTRIBUTING' and p_next_state = 'COMPLETED'
    and not (p_evidence ? 'reconciliationHash')
  then raise exception 'reconciliation evidence required'; end if;

  if p_next_state = 'ARCHIVED'
    and (not (p_evidence ?& array['closeoutHash','founderApprovals'])
      or (p_evidence->>'founderApprovals')::integer <> 2)
  then raise exception 'closeout and two founder approvals required'; end if;

  if not (
    (p_expected_state='DRAFT' and p_next_state='READINESS_BLOCKED') or
    (p_expected_state='READINESS_BLOCKED' and p_next_state='FUNDED') or
    (p_expected_state='FUNDED' and p_next_state='SCHEDULED') or
    (p_expected_state='SCHEDULED' and p_next_state='ACTIVE') or
    (p_expected_state='ACTIVE' and p_next_state='VERIFYING') or
    (p_expected_state='VERIFYING' and p_next_state='ALLOCATIONS_FROZEN') or
    (p_expected_state='ALLOCATIONS_FROZEN' and p_next_state='DISTRIBUTING') or
    (p_expected_state='DISTRIBUTING' and p_next_state='COMPLETED') or
    (p_expected_state='COMPLETED' and p_next_state='ARCHIVED') or
    (p_expected_state='TERMINATED' and p_next_state='ARCHIVED') or
    (p_next_state='PAUSED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING')) or
    (p_next_state='TERMINATED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING','PAUSED')) or
    (p_expected_state='PAUSED' and p_next_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING'))
  ) then
    raise exception 'invalid campaign state transition: % -> %', p_expected_state,p_next_state;
  end if;

  if p_next_state in ('PAUSED','TERMINATED')
    and not (p_next_state='PAUSED' and p_automatic_security_pause)
    and p_authorized_signers <> 2
  then raise exception '% requires two authorized signers', p_next_state; end if;

  if p_expected_state='PAUSED' and p_next_state <> 'TERMINATED'
    and p_authorized_signers <> 2
  then raise exception 'resuming requires two founder approvals'; end if;

  update public.campaigns
  set state=p_next_state,
      resume_state=case
        when p_next_state='PAUSED' then p_expected_state
        when p_expected_state='PAUSED' then null
        else resume_state
      end,
      updated_at=now()
  where id=p_campaign_id
    and state=p_expected_state
    and (p_expected_state <> 'PAUSED' or p_next_state='TERMINATED' or resume_state=p_next_state)
  returning * into result;

  if not found then raise exception 'campaign state changed or campaign missing'; end if;

  insert into public.campaign_state_transitions(
    campaign_id,from_state,to_state,evidence,authorized_signers,automatic_security_pause
  ) values (
    p_campaign_id,p_expected_state,p_next_state,p_evidence,p_authorized_signers,p_automatic_security_pause
  );

  return result;
end;
$$;

revoke all on function public.transition_campaign_state(text,text,text,jsonb,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.transition_campaign_state(text,text,text,jsonb,integer,boolean)
  to service_role;
