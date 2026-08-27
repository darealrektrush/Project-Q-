-- Lock the founder-approved referral rewards and five-step Earn-to-Burn plan
-- into the existing inert DRAFT ruleset. This migration does not finalize the
-- rules, activate participation, create burn records, award XP, fund the
-- campaign, or authorize a token movement.

do $lock$
declare
  previous_rules_hash constant text := '67fcfcba5ee2a1a344e24df5ebcdba3db1581babb1438da0965dbba2995fd8af';
  expected_rules_hash constant text := 'f593a15ddaccffb870dcd24e12711692bdfa1e921150ce1c39f1c2fdaefb4020';
  expected_rules constant jsonb := $rules$
{"schema":"bond-campaign-rules-v1","campaignId":"bond-the-duck-2026","rulesetVersion":1,"status":"DRAFT","schedule":{"timeZone":"America/Vancouver","activeOpensAt":"2026-09-01T15:00:00.000Z","activeClosesAt":"2026-09-15T15:00:00.000Z","activeDays":14,"cycleHours":48,"cycleCount":7,"reviewOpensAt":"2026-09-16T15:00:00.000Z","review48HourCheckpointAt":"2026-09-18T15:00:00.000Z","reviewClosesAt":"2026-09-19T15:00:00.000Z"},"eligibility":{"telegramRequired":true,"oracleXRequired":true,"walletRequiredForRewards":true,"minimumFawkqUsd":2},"xpCaps":{"overallDaily":75,"participationDaily":15,"projectQDaily":20,"trendingBotsDaily":20},"verificationSources":{"websiteVotingCount":9,"websiteVoting":[{"sourceKey":"web:geckoterminal","name":"GeckoTerminal","url":"https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM","verificationMode":"AGGREGATE_ONLY","classification":"COMMUNITY_PROGRESS_ONLY","certificationStatus":"OBSERVED_NO_USER_RECEIPT","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:top100token","name":"Top100Token","url":"https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmooner","name":"CoinMooner","url":"https://coinmooner.com/coins/fawk-q-fawkq","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:gemfinder","name":"GemFinder","url":"https://gemfinder.cc/gem/29742","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinsniper","name":"CoinSniper","url":"https://coinsniper.net/coin/92949","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmun","name":"CoinMun","url":"https://coinmun.com/coins/fawk-q","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinboom","name":"CoinBoom","url":"https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"NO_FREE_VOTE_OBSERVED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinbuzzer","name":"CoinBuzzer","url":"https://coinbuzzer.me/coin/860","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinscope","name":"CoinScope","url":"https://www.coinscope.co/coin/fawkq","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false}],"telegramBotFirstDailyXp":2,"telegramBotRepeatXp":1,"telegramBotDailyMaximumXp":20,"telegramPushPointPerAcceptedVote":1,"telegramBotCooldownSeconds":{"@majorbuybot":7200,"@wtftrending":3600,"@trenchobot":86400,"@BBtrendingbot":3600,"@drokiatrendsbot":3600},"telegramBotCooldownCertification":{"@majorbuybot":"OBSERVED","@wtftrending":"OBSERVED","@trenchobot":"OBSERVED","@BBtrendingbot":"OBSERVED","@drokiatrendsbot":"OBSERVED"},"telegramBots":["@majorbuybot","@wtftrending","@trenchobot","@BBtrendingbot","@drokiatrendsbot"]},"commitments":{"campaignRewardsBaseUnits":"15000000000000","campaignFounderCount":2,"campaignPerFounderBaseUnits":"7500000000000","diamondDuckBaseUnits":"2500000000000","diamondDuckPerFounderBaseUnits":"1250000000000","topContributorLamports":"1000000000","earnToBurnBaseUnits":"15000000000000","earnToBurnSource":"FAWKQ_CREATOR_WALLET","totalTokenCommitmentBaseUnits":"32500000000000"},"releases":{"verifiedActivityPercent":25,"postReviewPercent":50,"phasedPercent":25,"phasedInstallments":5,"phasedInstallmentPercent":5,"phasedOffsetDays":[6,12,18,24,30]},"missions":["oracle-raids","website-voting","trending-bots","bagwork","buy-to-earn","participation-xp","community-pulse","verified-referrals","earn-to-burn"],"referrals":{"minimumPurchaseUsd":2,"bonusXp":10,"xInviteMainPostId":null,"xInviteRequiredDistinctMentions":3,"xInviteBonusXp":5},"earnToBurn":{"programId":"fawkq-earn-to-burn","openingBurnBaseUnits":"15000000000000","openingBurnType":"CREATOR_WALLET_RESERVE","milestones":[{"id":"bond-burn-1","sequence":1,"label":"Burn Milestone 1","progressTargetUnits":"2000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-2","sequence":2,"label":"Burn Milestone 2","progressTargetUnits":"5000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-3","sequence":3,"label":"Burn Milestone 3","progressTargetUnits":"9000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-4","sequence":4,"label":"Burn Milestone 4","progressTargetUnits":"14000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-5","sequence":5,"label":"Burn Milestone 5","progressTargetUnits":"20000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"}]}}
  $rules$::jsonb;
  campaign_row public.campaigns;
  rules_row public.ruleset_versions;
begin
  select * into campaign_row
  from public.campaigns
  where id = 'bond-the-duck-2026'
  for update;

  if not found
    or campaign_row.state <> 'DRAFT'
    or campaign_row.ruleset_version <> 1
    or campaign_row.registry_version is not null
    or campaign_row.funded_base_units <> 0
    or campaign_row.rules_hash not in (previous_rules_hash, expected_rules_hash)
  then
    raise exception 'refusing to update changed or active Bond the Duck campaign rules';
  end if;

  if exists (
    select 1 from public.campaign_ruleset_proposals
    where campaign_id = 'bond-the-duck-2026'
  ) or exists (
    select 1 from public.campaign_ruleset_finalizations
    where campaign_id = 'bond-the-duck-2026'
  ) then
    raise exception 'refusing to update Bond the Duck after rules governance evidence exists';
  end if;

  if exists (
    select 1 from public.cycles
    where campaign_id = 'bond-the-duck-2026'
      and (
        allocation_base_units <> 0
        or finalized_at is not null
        or cutoff_slot is not null
        or cutoff_blockhash is not null
        or commit_hash is not null
        or reveal_value is not null
      )
  ) then
    raise exception 'refusing to update Bond the Duck after cycle evidence exists';
  end if;

  select * into rules_row
  from public.ruleset_versions
  where campaign_id = 'bond-the-duck-2026' and version = 1
  for update;

  if not found
    or (
      (rules_row.rules_hash = previous_rules_hash)
      is distinct from
      (campaign_row.rules_hash = previous_rules_hash)
    )
    or rules_row.rules_hash not in (previous_rules_hash, expected_rules_hash)
  then
    raise exception 'Bond the Duck campaign and ruleset hashes do not match';
  end if;

  update public.ruleset_versions
  set rules_json = expected_rules,
      rules_hash = expected_rules_hash
  where campaign_id = 'bond-the-duck-2026'
    and version = 1
    and rules_hash = previous_rules_hash;

  update public.campaigns
  set rules_hash = expected_rules_hash
  where id = 'bond-the-duck-2026'
    and state = 'DRAFT'
    and ruleset_version = 1
    and funded_base_units = 0
    and rules_hash = previous_rules_hash;

  select * into campaign_row
  from public.campaigns
  where id = 'bond-the-duck-2026';

  select * into rules_row
  from public.ruleset_versions
  where campaign_id = 'bond-the-duck-2026' and version = 1;

  if campaign_row.state <> 'DRAFT'
    or campaign_row.ruleset_version <> 1
    or campaign_row.rules_hash <> expected_rules_hash
    or campaign_row.funded_base_units <> 0
    or rules_row.rules_hash <> expected_rules_hash
    or rules_row.rules_json <> expected_rules
    or expected_rules->>'status' <> 'DRAFT'
    or expected_rules#>>'{referrals,bonusXp}' <> '10'
    or expected_rules#>>'{referrals,xInviteBonusXp}' <> '5'
    or jsonb_array_length(expected_rules#>'{earnToBurn,milestones}') <> 5
  then
    raise exception 'Bond the Duck locked DRAFT rules failed postcondition checks';
  end if;
end;
$lock$;

