-- Versioned final-rules governance for Bond the Duck. This migration creates
-- no proposals, decisions or finalizations and cannot fund, schedule or
-- activate a campaign.

create or replace function public.validate_bond_campaign_final_rules(
  p_rules jsonb,
  p_campaign_id text,
  p_version integer
) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare
  milestone_count integer;
  milestone_id_count integer;
  milestone_burn_total numeric;
  milestones_ordered boolean;
begin
  if p_rules is null or jsonb_typeof(p_rules) is distinct from 'object'
    or p_campaign_id is distinct from 'bond-the-duck-2026'
    or p_version is null or p_version < 1
    or p_rules->>'schema' is distinct from 'bond-campaign-rules-v1'
    or p_rules->>'campaignId' is distinct from p_campaign_id
    or p_rules->>'status' is distinct from 'FINAL'
    or coalesce(p_rules->>'rulesetVersion', '') !~ '^[1-9][0-9]*$'
    or (p_rules->>'rulesetVersion')::integer is distinct from p_version
  then return false; end if;

  if p_rules#>>'{schedule,timeZone}' is distinct from 'America/Vancouver'
    or p_rules#>>'{schedule,activeOpensAt}' is distinct from '2026-09-01T15:00:00.000Z'
    or p_rules#>>'{schedule,activeClosesAt}' is distinct from '2026-09-15T15:00:00.000Z'
    or p_rules#>>'{schedule,reviewOpensAt}' is distinct from '2026-09-16T15:00:00.000Z'
    or p_rules#>>'{schedule,review48HourCheckpointAt}' is distinct from '2026-09-18T15:00:00.000Z'
    or p_rules#>>'{schedule,reviewClosesAt}' is distinct from '2026-09-19T15:00:00.000Z'
    or p_rules#>>'{schedule,activeDays}' is distinct from '14'
    or p_rules#>>'{schedule,cycleHours}' is distinct from '48'
    or p_rules#>>'{schedule,cycleCount}' is distinct from '7'
  then return false; end if;

  if p_rules#>>'{commitments,campaignRewardsBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{commitments,campaignFounderCount}' is distinct from '2'
    or p_rules#>>'{commitments,campaignPerFounderBaseUnits}' is distinct from '7500000000000'
    or p_rules#>>'{commitments,diamondDuckBaseUnits}' is distinct from '2500000000000'
    or p_rules#>>'{commitments,diamondDuckPerFounderBaseUnits}' is distinct from '1250000000000'
    or p_rules#>>'{commitments,topContributorLamports}' is distinct from '1000000000'
    or p_rules#>>'{commitments,earnToBurnBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{commitments,earnToBurnSource}' is distinct from 'FAWKQ_CREATOR_WALLET'
    or p_rules#>>'{commitments,totalTokenCommitmentBaseUnits}' is distinct from '32500000000000'
  then return false; end if;

  if p_rules->'missions' is distinct from '["oracle-raids","website-voting","trending-bots","bagwork","buy-to-earn","participation-xp","community-pulse","verified-referrals","earn-to-burn"]'::jsonb
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
    or p_rules#>'{verificationSources,websiteVoting}' is distinct from
      '[{"sourceKey":"web:geckoterminal","name":"GeckoTerminal","url":"https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM","verificationMode":"AGGREGATE_ONLY","classification":"COMMUNITY_PROGRESS_ONLY","certificationStatus":"OBSERVED_NO_USER_RECEIPT","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:top100token","name":"Top100Token","url":"https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmooner","name":"CoinMooner","url":"https://coinmooner.com/coins/fawk-q-fawkq","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:gemfinder","name":"GemFinder","url":"https://gemfinder.cc/gem/29742","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinsniper","name":"CoinSniper","url":"https://coinsniper.net/coin/92949","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmun","name":"CoinMun","url":"https://coinmun.com/coins/fawk-q","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinboom","name":"CoinBoom","url":"https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"NO_FREE_VOTE_OBSERVED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinbuzzer","name":"CoinBuzzer","url":"https://coinbuzzer.me/coin/860","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinscope","name":"CoinScope","url":"https://www.coinscope.co/coin/fawkq","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false}]'::jsonb
    or p_rules#>>'{verificationSources,telegramBotFirstDailyXp}' is distinct from '2'
    or p_rules#>>'{verificationSources,telegramBotRepeatXp}' is distinct from '1'
    or p_rules#>>'{verificationSources,telegramBotDailyMaximumXp}' is distinct from '20'
    or p_rules#>>'{verificationSources,telegramPushPointPerAcceptedVote}' is distinct from '1'
    or p_rules#>'{verificationSources,telegramBotCooldownSeconds}' is distinct from
      '{"@majorbuybot":7200,"@wtftrending":3600,"@trenchobot":86400,"@BBtrendingbot":3600,"@drokiatrendsbot":3600}'::jsonb
    or p_rules#>'{verificationSources,telegramBotCooldownCertification}' is distinct from
      '{"@majorbuybot":"OBSERVED","@wtftrending":"OBSERVED","@trenchobot":"OBSERVED","@BBtrendingbot":"OBSERVED","@drokiatrendsbot":"OBSERVED"}'::jsonb
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
    or coalesce(p_rules#>>'{referrals,bonusXp}', '') !~ '^[1-9][0-9]*$'
    or (p_rules#>>'{referrals,bonusXp}')::integer > 75
    or coalesce(p_rules#>>'{referrals,xInviteMainPostId}', '') !~ '^[0-9]{1,24}$'
    or p_rules#>>'{referrals,xInviteRequiredDistinctMentions}' is distinct from '3'
    or coalesce(p_rules#>>'{referrals,xInviteBonusXp}', '') !~ '^[1-9][0-9]*$'
    or (p_rules#>>'{referrals,xInviteBonusXp}')::integer > 75
  then return false; end if;

  if p_rules#>>'{earnToBurn,programId}' is distinct from 'fawkq-earn-to-burn'
    or p_rules#>>'{earnToBurn,openingBurnBaseUnits}' is distinct from '15000000000000'
    or p_rules#>>'{earnToBurn,openingBurnType}' is distinct from 'CREATOR_WALLET_RESERVE'
    or jsonb_typeof(p_rules#>'{earnToBurn,milestones}') is distinct from 'array'
    or coalesce(jsonb_array_length(p_rules#>'{earnToBurn,milestones}'), 0) = 0
  then return false; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rules#>'{earnToBurn,milestones}') milestone
    where coalesce(milestone->>'id', '') !~ '^[a-z0-9][a-z0-9-]{2,63}$'
      or coalesce(milestone->>'progressTargetUnits', '') !~ '^[1-9][0-9]*$'
      or coalesce(milestone->>'burnAmountBaseUnits', '') !~ '^[1-9][0-9]*$'
  ) then return false; end if;

  with parsed as (
    select milestone->>'id' as id,
      (milestone->>'progressTargetUnits')::numeric as target,
      (milestone->>'burnAmountBaseUnits')::numeric as amount,
      ordinal
    from jsonb_array_elements(p_rules#>'{earnToBurn,milestones}')
      with ordinality as item(milestone, ordinal)
  ), ordered as (
    select *, lag(target) over (order by ordinal) as prior_target from parsed
  )
  select count(*)::integer, count(distinct id)::integer, sum(amount),
    bool_and(target > coalesce(prior_target, 0))
  into milestone_count, milestone_id_count, milestone_burn_total, milestones_ordered
  from ordered;

  return milestone_count = milestone_id_count
    and milestone_burn_total = 15000000000000
    and coalesce(milestones_ordered, false);
exception when others then
  return false;
end;
$$;

create table if not exists public.campaign_ruleset_proposals (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  version integer not null check (version > 0),
  rules_json jsonb not null check (jsonb_typeof(rules_json) = 'object'),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  proposed_by bigint not null,
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (id, campaign_id),
  unique (campaign_id, rules_hash),
  foreign key (campaign_id, proposed_by)
    references public.campaign_founders(campaign_id, founder_user_id),
  check (public.validate_bond_campaign_final_rules(rules_json, campaign_id, version))
);

create table if not exists public.campaign_ruleset_decisions (
  id bigserial primary key,
  proposal_id bigint not null,
  campaign_id text not null,
  founder_user_id bigint not null,
  decision text not null check (decision in ('APPROVE','HOLD')),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default now(),
  foreign key (proposal_id, campaign_id)
    references public.campaign_ruleset_proposals(id, campaign_id),
  foreign key (campaign_id, founder_user_id)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create table if not exists public.campaign_ruleset_finalizations (
  id bigserial primary key,
  proposal_id bigint not null unique,
  campaign_id text not null,
  version integer not null check (version > 0),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  finalized_by bigint not null,
  finalized_at timestamptz not null default now(),
  unique (campaign_id, version),
  foreign key (proposal_id, campaign_id)
    references public.campaign_ruleset_proposals(id, campaign_id),
  foreign key (campaign_id, finalized_by)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create index if not exists campaign_ruleset_proposals_latest_idx
  on public.campaign_ruleset_proposals(campaign_id, version desc, created_at desc, id desc);
create index if not exists campaign_ruleset_decisions_latest_idx
  on public.campaign_ruleset_decisions(proposal_id, founder_user_id, decided_at desc, id desc);

drop trigger if exists campaign_ruleset_proposals_immutable on public.campaign_ruleset_proposals;
create trigger campaign_ruleset_proposals_immutable
before update or delete on public.campaign_ruleset_proposals
for each row execute function public.reject_campaign_ledger_mutation();
drop trigger if exists campaign_ruleset_decisions_immutable on public.campaign_ruleset_decisions;
create trigger campaign_ruleset_decisions_immutable
before update or delete on public.campaign_ruleset_decisions
for each row execute function public.reject_campaign_ledger_mutation();
drop trigger if exists campaign_ruleset_finalizations_immutable on public.campaign_ruleset_finalizations;
create trigger campaign_ruleset_finalizations_immutable
before update or delete on public.campaign_ruleset_finalizations
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.submit_campaign_ruleset_proposal(
  p_campaign_id text,
  p_founder_user_id bigint,
  p_version integer,
  p_rules_json jsonb,
  p_rules_hash text,
  p_idempotency_key text
) returns public.campaign_ruleset_proposals
language plpgsql security invoker set search_path = '' as $$
declare
  campaign public.campaigns;
  result public.campaign_ruleset_proposals;
begin
  if p_rules_hash is null or p_rules_hash !~ '^[0-9a-f]{64}$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
    or not public.validate_bond_campaign_final_rules(p_rules_json, p_campaign_id, p_version)
  then raise exception 'invalid final campaign rules proposal'; end if;

  select * into result from public.campaign_ruleset_proposals
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.proposed_by is distinct from p_founder_user_id
      or result.version is distinct from p_version
      or result.rules_hash is distinct from p_rules_hash
      or result.rules_json is distinct from p_rules_json
    then raise exception 'rules proposal idempotency key was reused'; end if;
    return result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_campaign_id));
  select * into campaign from public.campaigns where id = p_campaign_id for update;
  if not found or campaign.state not in ('DRAFT','READINESS_BLOCKED') then
    raise exception 'campaign is not accepting final rules proposals';
  end if;
  if p_version <> campaign.ruleset_version + 1 then
    raise exception 'final rules proposal must be the next ruleset version';
  end if;
  if (select count(*) from public.campaign_founders where campaign_id = p_campaign_id and enabled) <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id and founder_user_id = p_founder_user_id and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  insert into public.campaign_ruleset_proposals
    (campaign_id, version, rules_json, rules_hash, proposed_by, idempotency_key)
  values
    (p_campaign_id, p_version, p_rules_json, p_rules_hash, p_founder_user_id, p_idempotency_key)
  returning * into result;
  return result;
end;
$$;

create or replace function public.record_campaign_ruleset_decision(
  p_proposal_id bigint,
  p_founder_user_id bigint,
  p_decision text,
  p_idempotency_key text
) returns public.campaign_ruleset_decisions
language plpgsql security invoker set search_path = '' as $$
declare
  proposal public.campaign_ruleset_proposals;
  result public.campaign_ruleset_decisions;
begin
  if p_proposal_id is null or p_proposal_id <= 0
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_decision is null or p_decision not in ('APPROVE','HOLD')
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid final rules decision'; end if;

  select * into result from public.campaign_ruleset_decisions
  where idempotency_key = p_idempotency_key;
  if found then
    if result.proposal_id is distinct from p_proposal_id
      or result.founder_user_id is distinct from p_founder_user_id
      or result.decision is distinct from p_decision
    then raise exception 'rules decision idempotency key was reused'; end if;
    return result;
  end if;

  select * into proposal from public.campaign_ruleset_proposals where id = p_proposal_id;
  if not found then raise exception 'final rules proposal not found'; end if;
  if exists (select 1 from public.campaign_ruleset_finalizations where proposal_id = p_proposal_id) then
    raise exception 'final rules proposal is already finalized';
  end if;
  if not exists (
    select 1 from public.campaigns
    where id = proposal.campaign_id and state in ('DRAFT','READINESS_BLOCKED')
  ) then raise exception 'campaign is not accepting final rules decisions'; end if;
  if (select count(*) from public.campaign_founders where campaign_id = proposal.campaign_id and enabled) <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = proposal.campaign_id and founder_user_id = p_founder_user_id and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  insert into public.campaign_ruleset_decisions
    (proposal_id, campaign_id, founder_user_id, decision, idempotency_key)
  values
    (proposal.id, proposal.campaign_id, p_founder_user_id, p_decision, p_idempotency_key)
  returning * into result;
  return result;
end;
$$;

create or replace function public.finalize_campaign_ruleset_proposal(
  p_proposal_id bigint,
  p_founder_user_id bigint
) returns public.campaign_ruleset_finalizations
language plpgsql security invoker set search_path = '' as $$
declare
  proposal public.campaign_ruleset_proposals;
  campaign public.campaigns;
  result public.campaign_ruleset_finalizations;
  approval_count integer;
begin
  select * into result from public.campaign_ruleset_finalizations where proposal_id = p_proposal_id;
  if found then return result; end if;

  select * into proposal from public.campaign_ruleset_proposals where id = p_proposal_id for update;
  if not found then raise exception 'final rules proposal not found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(proposal.campaign_id));
  select * into campaign from public.campaigns where id = proposal.campaign_id for update;
  if not found or campaign.state not in ('DRAFT','READINESS_BLOCKED') then
    raise exception 'campaign is not accepting final rules finalization';
  end if;
  if proposal.version <> campaign.ruleset_version + 1 then
    raise exception 'final rules proposal is stale';
  end if;
  if not public.validate_bond_campaign_final_rules(proposal.rules_json, proposal.campaign_id, proposal.version) then
    raise exception 'final rules proposal failed semantic validation';
  end if;
  if (select count(*) from public.campaign_founders where campaign_id = proposal.campaign_id and enabled) <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = proposal.campaign_id and founder_user_id = p_founder_user_id and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  with latest_decisions as (
    select distinct on (decision.founder_user_id)
      decision.founder_user_id, decision.decision
    from public.campaign_ruleset_decisions decision
    join public.campaign_founders founder
      on founder.campaign_id = decision.campaign_id
     and founder.founder_user_id = decision.founder_user_id
     and founder.enabled
    where decision.proposal_id = proposal.id
    order by decision.founder_user_id, decision.decided_at desc, decision.id desc
  )
  select count(*) into approval_count from latest_decisions where decision = 'APPROVE';
  if approval_count <> 2 then
    raise exception 'two current founder approvals are required for exact final rules';
  end if;

  insert into public.ruleset_versions (campaign_id, version, rules_json, rules_hash)
  values (proposal.campaign_id, proposal.version, proposal.rules_json, proposal.rules_hash);
  update public.campaigns set
    ruleset_version = proposal.version,
    rules_hash = proposal.rules_hash,
    updated_at = now()
  where id = proposal.campaign_id;
  insert into public.campaign_ruleset_finalizations
    (proposal_id, campaign_id, version, rules_hash, finalized_by)
  values
    (proposal.id, proposal.campaign_id, proposal.version, proposal.rules_hash, p_founder_user_id)
  returning * into result;
  return result;
end;
$$;

alter table public.campaign_ruleset_proposals enable row level security;
alter table public.campaign_ruleset_decisions enable row level security;
alter table public.campaign_ruleset_finalizations enable row level security;

revoke all on public.campaign_ruleset_proposals, public.campaign_ruleset_decisions,
  public.campaign_ruleset_finalizations from public, anon, authenticated;
revoke all on function public.validate_bond_campaign_final_rules(jsonb,text,integer),
  public.submit_campaign_ruleset_proposal(text,bigint,integer,jsonb,text,text),
  public.record_campaign_ruleset_decision(bigint,bigint,text,text),
  public.finalize_campaign_ruleset_proposal(bigint,bigint)
  from public, anon, authenticated;

grant select, insert on public.campaign_ruleset_proposals, public.campaign_ruleset_decisions,
  public.campaign_ruleset_finalizations to service_role;
grant usage, select on sequence public.campaign_ruleset_proposals_id_seq,
  public.campaign_ruleset_decisions_id_seq, public.campaign_ruleset_finalizations_id_seq
  to service_role;
grant execute on function public.validate_bond_campaign_final_rules(jsonb,text,integer),
  public.submit_campaign_ruleset_proposal(text,bigint,integer,jsonb,text,text),
  public.record_campaign_ruleset_decision(bigint,bigint,text,text),
  public.finalize_campaign_ruleset_proposal(bigint,bigint)
  to service_role;
