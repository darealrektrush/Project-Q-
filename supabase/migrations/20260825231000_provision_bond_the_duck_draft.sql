-- Provision the inert Bond the Duck campaign identity, draft rules and seven
-- locked schedule rows. This migration records no funding, participants,
-- founders, sources, rewards, approvals, burns or state transitions.

do $provision$
declare
  expected_rules_hash constant text := '67fcfcba5ee2a1a344e24df5ebcdba3db1581babb1438da0965dbba2995fd8af';
  expected_rules constant jsonb := $rules$
  {
    "campaignId":"bond-the-duck-2026",
    "commitments":{"campaignFounderCount":2,"campaignPerFounderBaseUnits":"7500000000000","campaignRewardsBaseUnits":"15000000000000","diamondDuckBaseUnits":"2500000000000","diamondDuckPerFounderBaseUnits":"1250000000000","earnToBurnBaseUnits":"15000000000000","earnToBurnSource":"FAWKQ_CREATOR_WALLET","topContributorLamports":"1000000000","totalTokenCommitmentBaseUnits":"32500000000000"},
    "earnToBurn":{"milestones":[],"openingBurnBaseUnits":"15000000000000","openingBurnType":"CREATOR_WALLET_RESERVE","programId":"fawkq-earn-to-burn"},
    "eligibility":{"minimumFawkqUsd":2,"oracleXRequired":true,"telegramRequired":true,"walletRequiredForRewards":true},
    "missions":["oracle-raids","website-voting","trending-bots","bagwork","buy-to-earn","participation-xp","community-pulse","verified-referrals","earn-to-burn"],
    "referrals":{"bonusXp":null,"minimumPurchaseUsd":2,"xInviteBonusXp":null,"xInviteMainPostId":null,"xInviteRequiredDistinctMentions":3},
    "releases":{"phasedInstallmentPercent":5,"phasedInstallments":5,"phasedOffsetDays":[6,12,18,24,30],"phasedPercent":25,"postReviewPercent":50,"verifiedActivityPercent":25},
    "rulesetVersion":1,
    "schedule":{"activeClosesAt":"2026-09-15T15:00:00.000Z","activeDays":14,"activeOpensAt":"2026-09-01T15:00:00.000Z","cycleCount":7,"cycleHours":48,"review48HourCheckpointAt":"2026-09-18T15:00:00.000Z","reviewClosesAt":"2026-09-19T15:00:00.000Z","reviewOpensAt":"2026-09-16T15:00:00.000Z","timeZone":"America/Vancouver"},
    "schema":"bond-campaign-rules-v1",
    "status":"DRAFT",
    "verificationSources":{"telegramBotCooldownCertification":{"@BBtrendingbot":"OBSERVED","@drokiatrendsbot":"OBSERVED","@majorbuybot":"OBSERVED","@trenchobot":"OBSERVED","@wtftrending":"OBSERVED"},"telegramBotCooldownSeconds":{"@BBtrendingbot":3600,"@drokiatrendsbot":3600,"@majorbuybot":7200,"@trenchobot":86400,"@wtftrending":3600},"telegramBotDailyMaximumXp":20,"telegramBotFirstDailyXp":2,"telegramBotRepeatXp":1,"telegramBots":["@majorbuybot","@wtftrending","@trenchobot","@BBtrendingbot","@drokiatrendsbot"],"telegramPushPointPerAcceptedVote":1,"websiteVoting":[{"sourceKey":"web:geckoterminal","name":"GeckoTerminal","url":"https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM","verificationMode":"AGGREGATE_ONLY","classification":"COMMUNITY_PROGRESS_ONLY","certificationStatus":"OBSERVED_NO_USER_RECEIPT","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:top100token","name":"Top100Token","url":"https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmooner","name":"CoinMooner","url":"https://coinmooner.com/coins/fawk-q-fawkq","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:gemfinder","name":"GemFinder","url":"https://gemfinder.cc/gem/29742","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinsniper","name":"CoinSniper","url":"https://coinsniper.net/coin/92949","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmun","name":"CoinMun","url":"https://coinmun.com/coins/fawk-q","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinboom","name":"CoinBoom","url":"https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"NO_FREE_VOTE_OBSERVED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinbuzzer","name":"CoinBuzzer","url":"https://coinbuzzer.me/coin/860","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinscope","name":"CoinScope","url":"https://www.coinscope.co/coin/fawkq","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false}],"websiteVotingCount":9},
    "xpCaps":{"overallDaily":75,"participationDaily":15,"projectQDaily":20,"trendingBotsDaily":20}
  }
  $rules$::jsonb;
  campaign_row public.campaigns;
  rules_row public.ruleset_versions;
  matching_cycles integer;
begin
  insert into public.campaigns (
    id, ruleset_version, rules_hash, registry_version, state, funded_base_units
  ) values (
    'bond-the-duck-2026', 1, expected_rules_hash, null, 'DRAFT', 0
  ) on conflict (id) do nothing;

  select * into campaign_row from public.campaigns where id = 'bond-the-duck-2026';
  if campaign_row.state <> 'DRAFT'
    or campaign_row.ruleset_version <> 1
    or campaign_row.rules_hash <> expected_rules_hash
    or campaign_row.registry_version is not null
    or campaign_row.funded_base_units <> 0
  then
    raise exception 'refusing to provision over a changed Bond the Duck campaign';
  end if;

  insert into public.ruleset_versions (
    campaign_id, version, rules_json, rules_hash
  ) values (
    'bond-the-duck-2026', 1, expected_rules, expected_rules_hash
  ) on conflict (campaign_id, version) do nothing;

  select * into rules_row from public.ruleset_versions
  where campaign_id = 'bond-the-duck-2026' and version = 1;
  if rules_row.rules_hash <> expected_rules_hash or rules_row.rules_json <> expected_rules then
    raise exception 'existing Bond the Duck ruleset does not match the reviewed draft';
  end if;

  if exists (
    select 1 from public.cycles
    where campaign_id = 'bond-the-duck-2026'
      and (finalized_at is not null or cutoff_slot is not null or cutoff_blockhash is not null
        or commit_hash is not null or reveal_value is not null)
  ) then
    raise exception 'refusing to provision over Bond the Duck cycle evidence';
  end if;

  insert into public.cycles (
    campaign_id, cycle_id, opens_at, closes_at, allocation_base_units
  ) values
    ('bond-the-duck-2026', 1, '2026-09-01T15:00:00Z', '2026-09-03T15:00:00Z', 0),
    ('bond-the-duck-2026', 2, '2026-09-03T15:00:00Z', '2026-09-05T15:00:00Z', 0),
    ('bond-the-duck-2026', 3, '2026-09-05T15:00:00Z', '2026-09-07T15:00:00Z', 0),
    ('bond-the-duck-2026', 4, '2026-09-07T15:00:00Z', '2026-09-09T15:00:00Z', 0),
    ('bond-the-duck-2026', 5, '2026-09-09T15:00:00Z', '2026-09-11T15:00:00Z', 0),
    ('bond-the-duck-2026', 6, '2026-09-11T15:00:00Z', '2026-09-13T15:00:00Z', 0),
    ('bond-the-duck-2026', 7, '2026-09-13T15:00:00Z', '2026-09-15T15:00:00Z', 0)
  on conflict (campaign_id, cycle_id) do nothing;

  select count(*) into matching_cycles
  from public.cycles
  where campaign_id = 'bond-the-duck-2026'
    and allocation_base_units = 0
    and closes_at = opens_at + interval '48 hours'
    and opens_at = ('2026-09-01T15:00:00Z'::timestamptz + ((cycle_id - 1) * interval '48 hours'))
    and closes_at = ('2026-09-01T15:00:00Z'::timestamptz + (cycle_id * interval '48 hours'));
  if matching_cycles <> 7 then
    raise exception 'Bond the Duck cycle schedule does not match the seven locked windows';
  end if;
end;
$provision$;
