-- Lock Bond Buy-to-Earn economics and conservation impact commitment.
-- No funds, campaign state, ruleset, winner, burn or payout are changed.
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
    or p_rules#>>'{commitments,topContributorConservationLamports}' is distinct from '100000000'
    or p_rules#>>'{commitments,topContributorConservationFundingSource}' is distinct from 'PROJECT_FUNDED_SEPARATE_SOL'
    or p_rules#>>'{commitments,topContributorConservationDestination}' is distinct from 'OCEAN_CONSERVATION_VAULT'
    or p_rules#>>'{commitments,topContributorConservationAttribution}' is distinct from 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY'
    or p_rules#>>'{commitments,totalSolCommitmentLamports}' is distinct from '1100000000'
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
    or p_rules#>>'{buyToEarn,mode}' is distinct from 'WEIGHT_ONLY'
    or p_rules#>>'{buyToEarn,separateTokenPool}' is distinct from 'false'
    or p_rules#>>'{buyToEarn,poolBaseUnits}' is distinct from '0'
    or p_rules#>>'{buyToEarn,fundingSource}' is distinct from 'SQUADS_COMMUNITY_VAULT_CAMPAIGN_REWARDS'
    or p_rules#>>'{buyToEarn,includedInCampaignRewardsBaseUnits}' is distinct from '15000000000000'
    or (p_rules#>>'{buyToEarn,tier1NetBuySol}')::numeric <> 0.07
    or (p_rules#>>'{buyToEarn,tier1Weight}')::integer <> 1
    or (p_rules#>>'{buyToEarn,tier2NetBuySol}')::numeric <> 0.20
    or (p_rules#>>'{buyToEarn,tier2Weight}')::integer <> 3
    or p_rules#>>'{buyToEarn,weightedDrawPool}' is distinct from 'RANKS_3_TO_15'
  then return false; end if;

  return true;
exception when others then
  return false;
end;
$$;



alter table public.campaign_funding_proposals
  add column if not exists conservation_vault_address text,
  add column if not exists conservation_contribution_lamports bigint not null default 100000000,
  add column if not exists total_sol_commitment_lamports bigint not null default 1100000000,
  add column if not exists conservation_attribution text not null default 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY';

alter table public.campaign_funding_proposals
  alter column conservation_vault_address set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_funding_proposals'::regclass
      and conname='campaign_funding_conservation_vault_check'
  ) then
    alter table public.campaign_funding_proposals
      add constraint campaign_funding_conservation_vault_check
      check (conservation_vault_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_funding_proposals'::regclass
      and conname='campaign_funding_conservation_amount_check'
  ) then
    alter table public.campaign_funding_proposals
      add constraint campaign_funding_conservation_amount_check
      check (conservation_contribution_lamports = 100000000);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_funding_proposals'::regclass
      and conname='campaign_funding_total_sol_check'
  ) then
    alter table public.campaign_funding_proposals
      add constraint campaign_funding_total_sol_check
      check (total_sol_commitment_lamports = 1100000000);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_funding_proposals'::regclass
      and conname='campaign_funding_conservation_attribution_check'
  ) then
    alter table public.campaign_funding_proposals
      add constraint campaign_funding_conservation_attribution_check
      check (conservation_attribution = 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY');
  end if;
end $$;

revoke all on function public.submit_campaign_funding_proposal(text,bigint,text,text,text,timestamptz,text)
  from public, anon, authenticated;
drop function if exists public.submit_campaign_funding_proposal(text,bigint,text,text,text,timestamptz,text);

create or replace function public.submit_campaign_funding_proposal(
  p_campaign_id text,
  p_founder_user_id bigint,
  p_vault_address text,
  p_conservation_vault_address text,
  p_evidence_url text,
  p_evidence_hash text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns public.campaign_funding_proposals
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  result public.campaign_funding_proposals;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_vault_address is null or btrim(p_vault_address) !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_conservation_vault_address is null
      or btrim(p_conservation_vault_address) !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_evidence_url is null or p_evidence_url !~* '^https://'
    or p_evidence_hash is null or p_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_verified_at is null or p_verified_at > now() + interval '5 minutes'
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid funding proposal'; end if;

  select * into result
  from public.campaign_funding_proposals
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.proposed_by is distinct from p_founder_user_id
      or result.vault_address is distinct from btrim(p_vault_address)
      or result.conservation_vault_address is distinct from btrim(p_conservation_vault_address)
      or result.evidence_url is distinct from p_evidence_url
      or result.evidence_hash is distinct from p_evidence_hash
      or result.verified_at is distinct from p_verified_at
    then raise exception 'funding proposal idempotency key was reused'; end if;
    return result;
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;
  if not found or campaign_row.state not in ('DRAFT','READINESS_BLOCKED') then
    raise exception 'campaign is not accepting funding proposals';
  end if;

  if (select count(*) from public.campaign_founders
      where campaign_id = p_campaign_id and enabled) <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  insert into public.campaign_funding_proposals (
    campaign_id, vault_address, vault_base_units,
    squads_approval_threshold, squads_member_count,
    top_contributor_prize_lamports,
    conservation_vault_address, conservation_contribution_lamports,
    total_sol_commitment_lamports, conservation_attribution,
    evidence_url, evidence_hash, verified_at, proposed_by, idempotency_key
  ) values (
    p_campaign_id, btrim(p_vault_address), 17500000000000,
    2, 3, 1000000000,
    btrim(p_conservation_vault_address), 100000000,
    1100000000, 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY',
    p_evidence_url, p_evidence_hash, p_verified_at, p_founder_user_id, p_idempotency_key
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.finalize_campaign_funding(
  p_proposal_id bigint,
  p_founder_user_id bigint
) returns public.campaigns
language plpgsql
security invoker
set search_path = '' as $$
declare
  proposal public.campaign_funding_proposals;
  campaign_row public.campaigns;
  approval_count integer;
  enabled_founders integer;
  result public.campaigns;
begin
  if p_proposal_id is null or p_proposal_id <= 0
    or p_founder_user_id is null or p_founder_user_id <= 0
  then raise exception 'invalid funding finalization'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funding:' || p_proposal_id::text));

  if exists (
    select 1 from public.campaign_funding_finalizations
    where proposal_id = p_proposal_id
  ) then
    select c.* into result
    from public.campaigns c
    join public.campaign_funding_proposals p on p.campaign_id = c.id
    where p.id = p_proposal_id;
    return result;
  end if;

  select * into proposal
  from public.campaign_funding_proposals
  where id = p_proposal_id
  for share;
  if not found then raise exception 'funding proposal not found'; end if;

  if proposal.vault_base_units <> 17500000000000
    or proposal.squads_approval_threshold <> 2
    or proposal.squads_member_count <> 3
    or proposal.top_contributor_prize_lamports <> 1000000000
    or proposal.conservation_contribution_lamports <> 100000000
    or proposal.total_sol_commitment_lamports <> 1100000000
    or proposal.conservation_attribution <> 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY'
    or proposal.conservation_vault_address is null
  then raise exception 'funding proposal does not match locked Bond economics'; end if;

  select * into campaign_row
  from public.campaigns
  where id = proposal.campaign_id
  for update;
  if not found or campaign_row.state <> 'READINESS_BLOCKED' then
    raise exception 'funding can only finalize from READINESS_BLOCKED';
  end if;
  if campaign_row.funded_base_units not in (0,17500000000000) then
    raise exception 'campaign funding ledger contains conflicting amount';
  end if;

  if proposal.verified_at < now() - interval '72 hours' then
    raise exception 'funding evidence is stale';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = proposal.campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  select count(*) into enabled_founders
  from public.campaign_founders
  where campaign_id = proposal.campaign_id and enabled;
  if enabled_founders <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;

  with latest as (
    select distinct on (d.founder_user_id)
      d.founder_user_id, d.decision
    from public.campaign_funding_decisions d
    join public.campaign_founders f
      on f.campaign_id = d.campaign_id
     and f.founder_user_id = d.founder_user_id
     and f.enabled
    where d.proposal_id = proposal.id
    order by d.founder_user_id, d.decided_at desc, d.id desc
  )
  select count(*) into approval_count
  from latest where decision = 'APPROVE';

  if approval_count <> 2 then
    raise exception 'two current founder approvals are required for funding finalization';
  end if;

  update public.campaigns
  set funded_base_units = 17500000000000,
      updated_at = now()
  where id = proposal.campaign_id
  returning * into result;

  insert into public.campaign_funding_finalizations(
    proposal_id, campaign_id, finalized_by
  ) values (
    proposal.id, proposal.campaign_id, p_founder_user_id
  );

  return result;
end;
$$;

create or replace function public.enforce_bond_impact_funding_transition()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
begin
  if new.campaign_id <> 'bond-the-duck-2026'
    or new.from_state <> 'READINESS_BLOCKED'
    or new.to_state <> 'FUNDED'
  then return new; end if;

  if not (new.evidence ?& array[
    'topContributorPrizeLamports',
    'oceanConservationContributionLamports',
    'totalSolCommitmentLamports',
    'conservationVaultAddress',
    'conservationAttribution'
  ]) then
    raise exception 'Bond funded transition requires winner prize and conservation impact evidence';
  end if;

  if (new.evidence->>'topContributorPrizeLamports')::bigint <> 1000000000
    or (new.evidence->>'oceanConservationContributionLamports')::bigint <> 100000000
    or (new.evidence->>'totalSolCommitmentLamports')::bigint <> 1100000000
    or coalesce(new.evidence->>'conservationVaultAddress','') !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or new.evidence->>'conservationAttribution' <> 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY'
  then raise exception 'Bond SOL impact funding evidence does not reconcile'; end if;

  if not exists (
    select 1
    from public.campaign_funding_finalizations f
    join public.campaign_funding_proposals p on p.id = f.proposal_id
    where p.campaign_id = new.campaign_id
      and p.top_contributor_prize_lamports = 1000000000
      and p.conservation_contribution_lamports = 100000000
      and p.total_sol_commitment_lamports = 1100000000
      and p.conservation_vault_address = new.evidence->>'conservationVaultAddress'
      and p.conservation_attribution = 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY'
  ) then
    raise exception 'finalized Bond funding proposal with conservation impact is required';
  end if;

  return new;
end;
$$;

drop trigger if exists campaign_bond_impact_funding_transition
  on public.campaign_state_transitions;
create trigger campaign_bond_impact_funding_transition
before insert on public.campaign_state_transitions
for each row execute function public.enforce_bond_impact_funding_transition();

revoke all on function public.submit_campaign_funding_proposal(text,bigint,text,text,text,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.finalize_campaign_funding(bigint,bigint)
  from public, anon, authenticated;
revoke all on function public.enforce_bond_impact_funding_transition()
  from public, anon, authenticated;

grant execute on function public.submit_campaign_funding_proposal(text,bigint,text,text,text,text,timestamptz,text)
  to service_role;
grant execute on function public.finalize_campaign_funding(bigint,bigint)
  to service_role;
