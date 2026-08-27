-- Lock exact referral/X-invite queue semantics as DRAFT ruleset version 3 and
-- install the server-only atomic settlement RPC. The rules append remains
-- inert: it does not finalize or activate the campaign, award XP, fund a
-- reserve, or authorize any token movement.

do $lock$
declare
  previous_rules_hash constant text := '3f633f57407b3db02a24045293718cf8b3d7dfd3af7b15521a0bac7a58dc2f90';
  expected_rules_hash constant text := '7a90e066c2288be109a78f99d1cb9b3d7f6954a12a855a50c4e8a9e803448fe0';
  expected_rules constant jsonb := $rules$
{"schema":"bond-campaign-rules-v1","campaignId":"bond-the-duck-2026","rulesetVersion":3,"status":"DRAFT","schedule":{"timeZone":"America/Vancouver","activeOpensAt":"2026-09-01T15:00:00.000Z","activeClosesAt":"2026-09-15T15:00:00.000Z","activeDays":14,"cycleHours":48,"cycleCount":7,"reviewOpensAt":"2026-09-16T15:00:00.000Z","review48HourCheckpointAt":"2026-09-18T15:00:00.000Z","reviewClosesAt":"2026-09-19T15:00:00.000Z"},"eligibility":{"telegramRequired":true,"oracleXRequired":true,"walletRequiredForRewards":true,"minimumFawkqUsd":2},"xpCaps":{"overallDaily":75,"participationDaily":15,"projectQDaily":20,"trendingBotsDaily":20},"verificationSources":{"websiteVotingCount":9,"websiteVoting":[{"sourceKey":"web:geckoterminal","name":"GeckoTerminal","url":"https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM","verificationMode":"AGGREGATE_ONLY","classification":"COMMUNITY_PROGRESS_ONLY","certificationStatus":"OBSERVED_NO_USER_RECEIPT","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:top100token","name":"Top100Token","url":"https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmooner","name":"CoinMooner","url":"https://coinmooner.com/coins/fawk-q-fawkq","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:gemfinder","name":"GemFinder","url":"https://gemfinder.cc/gem/29742","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinsniper","name":"CoinSniper","url":"https://coinsniper.net/coin/92949","verificationMode":"PENDING_LIVE_TEST","classification":"SOURCE_UNAVAILABLE","certificationStatus":"CLOUDFLARE_BLOCKED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinmun","name":"CoinMun","url":"https://coinmun.com/coins/fawk-q","verificationMode":"SCREENSHOT_REVIEW","classification":"PROOF_SUPPORTED","certificationStatus":"OBSERVED_24H","cooldownSeconds":86400,"individualXpEligible":true},{"sourceKey":"web:coinboom","name":"CoinBoom","url":"https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"NO_FREE_VOTE_OBSERVED","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinbuzzer","name":"CoinBuzzer","url":"https://coinbuzzer.me/coin/860","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false},{"sourceKey":"web:coinscope","name":"CoinScope","url":"https://www.coinscope.co/coin/fawkq","verificationMode":"SOURCE_UNAVAILABLE","classification":"SOURCE_UNAVAILABLE","certificationStatus":"OFFLINE","cooldownSeconds":86400,"individualXpEligible":false}],"telegramBotFirstDailyXp":2,"telegramBotRepeatXp":1,"telegramBotDailyMaximumXp":20,"telegramPushPointPerAcceptedVote":1,"telegramBotCooldownSeconds":{"@majorbuybot":7200,"@wtftrending":3600,"@trenchobot":86400,"@BBtrendingbot":3600,"@drokiatrendsbot":3600},"telegramBotCooldownCertification":{"@majorbuybot":"OBSERVED","@wtftrending":"OBSERVED","@trenchobot":"OBSERVED","@BBtrendingbot":"OBSERVED","@drokiatrendsbot":"OBSERVED"},"telegramBots":["@majorbuybot","@wtftrending","@trenchobot","@BBtrendingbot","@drokiatrendsbot"]},"commitments":{"campaignRewardsBaseUnits":"15000000000000","campaignFounderCount":2,"campaignPerFounderBaseUnits":"7500000000000","diamondDuckBaseUnits":"2500000000000","diamondDuckPerFounderBaseUnits":"1250000000000","topContributorLamports":"1000000000","earnToBurnBaseUnits":"15000000000000","earnToBurnSource":"FAWKQ_CREATOR_WALLET","totalTokenCommitmentBaseUnits":"32500000000000"},"releases":{"verifiedActivityPercent":25,"postReviewPercent":50,"phasedPercent":25,"phasedInstallments":5,"phasedInstallmentPercent":5,"phasedOffsetDays":[6,12,18,24,30]},"missions":["oracle-raids","website-voting","trending-bots","bagwork","buy-to-earn","participation-xp","community-pulse","verified-referrals","earn-to-burn"],"referrals":{"minimumPurchaseUsd":2,"bonusXp":10,"bonusCapPolicy":"QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP","xInviteMainPostId":null,"xInviteRequiredDistinctMentions":3,"xInviteBonusXp":5},"earnToBurn":{"programId":"fawkq-earn-to-burn","openingBurnBaseUnits":"15000000000000","openingBurnType":"CREATOR_WALLET_RESERVE","milestones":[{"id":"bond-burn-1","sequence":1,"label":"Burn Milestone 1","progressTargetUnits":"2000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-2","sequence":2,"label":"Burn Milestone 2","progressTargetUnits":"5000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-3","sequence":3,"label":"Burn Milestone 3","progressTargetUnits":"9000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-4","sequence":4,"label":"Burn Milestone 4","progressTargetUnits":"14000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"},{"id":"bond-burn-5","sequence":5,"label":"Burn Milestone 5","progressTargetUnits":"20000","burnAmountBaseUnits":"3000000000000","burnType":"RESERVE_BURN"}]}}
  $rules$::jsonb;
  campaign_row public.campaigns;
  previous_rules_row public.ruleset_versions;
  expected_rules_row public.ruleset_versions;
begin
  select * into campaign_row
  from public.campaigns
  where id = 'bond-the-duck-2026'
  for update;

  if not found
    or campaign_row.state <> 'DRAFT'
    or campaign_row.registry_version is not null
    or campaign_row.funded_base_units <> 0
    or not (
      (campaign_row.ruleset_version = 2 and campaign_row.rules_hash = previous_rules_hash)
      or
      (campaign_row.ruleset_version = 3 and campaign_row.rules_hash = expected_rules_hash)
    )
  then
    raise exception 'refusing to append bonus queue rules to changed or active Bond the Duck campaign';
  end if;

  if exists (
    select 1 from public.campaign_ruleset_proposals
    where campaign_id = 'bond-the-duck-2026'
  ) or exists (
    select 1 from public.campaign_ruleset_finalizations
    where campaign_id = 'bond-the-duck-2026'
  ) then
    raise exception 'refusing to append Bond the Duck rules after governance evidence exists';
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
    raise exception 'refusing to append Bond the Duck rules after cycle evidence exists';
  end if;

  select * into previous_rules_row
  from public.ruleset_versions
  where campaign_id = 'bond-the-duck-2026' and version = 2;

  if not found
    or previous_rules_row.rules_hash <> previous_rules_hash
    or previous_rules_row.rules_json#>>'{rulesetVersion}' <> '2'
  then
    raise exception 'Bond the Duck DRAFT ruleset version 2 does not match its immutable baseline';
  end if;

  insert into public.ruleset_versions (
    campaign_id, version, rules_json, rules_hash
  ) values (
    'bond-the-duck-2026', 3, expected_rules, expected_rules_hash
  ) on conflict (campaign_id, version) do nothing;

  select * into expected_rules_row
  from public.ruleset_versions
  where campaign_id = 'bond-the-duck-2026' and version = 3;

  if not found
    or expected_rules_row.rules_hash <> expected_rules_hash
    or expected_rules_row.rules_json <> expected_rules
  then
    raise exception 'Bond the Duck DRAFT ruleset version 3 does not match the reviewed rules';
  end if;

  update public.campaigns
  set ruleset_version = 3,
      rules_hash = expected_rules_hash
  where id = 'bond-the-duck-2026'
    and state = 'DRAFT'
    and ruleset_version = 2
    and funded_base_units = 0
    and rules_hash = previous_rules_hash;

  select * into campaign_row
  from public.campaigns
  where id = 'bond-the-duck-2026';

  if campaign_row.state <> 'DRAFT'
    or campaign_row.ruleset_version <> 3
    or campaign_row.rules_hash <> expected_rules_hash
    or campaign_row.funded_base_units <> 0
    or expected_rules->>'status' <> 'DRAFT'
    or expected_rules#>>'{rulesetVersion}' <> '3'
    or expected_rules#>>'{referrals,bonusXp}' <> '10'
    or expected_rules#>>'{referrals,xInviteBonusXp}' <> '5'
    or expected_rules#>>'{referrals,bonusCapPolicy}' <> 'QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP'
  then
    raise exception 'Bond the Duck DRAFT ruleset version 3 failed postcondition checks';
  end if;
end;
$lock$;

create index if not exists campaign_referrals_pending_bonus_idx
  on public.campaign_referrals(campaign_id, qualified_at, id)
  where status = 'QUALIFIED' and bonus_xp_ledger_id is null;

create index if not exists campaign_x_invites_pending_bonus_idx
  on public.campaign_x_invite_events(campaign_id, verified_at, id)
  where bonus_xp_ledger_id is null;

create or replace function public.allow_campaign_x_invite_bonus_link()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'campaign_x_invite_events is append-only';
  end if;
  if to_jsonb(new) - 'bonus_xp_ledger_id' <> to_jsonb(old) - 'bonus_xp_ledger_id'
    or old.bonus_xp_ledger_id is not null
    or new.bonus_xp_ledger_id is null
  then
    raise exception 'only the first bonus XP ledger link may be attached';
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_x_invite_events_immutable on public.campaign_x_invite_events;
create trigger campaign_x_invite_events_immutable
before update or delete on public.campaign_x_invite_events
for each row execute function public.allow_campaign_x_invite_bonus_link();

revoke all on function public.allow_campaign_x_invite_bonus_link()
  from public, anon, authenticated;
grant update (bonus_xp_ledger_id) on public.campaign_x_invite_events to service_role;

create or replace function public.guard_campaign_bonus_queue_before_freeze()
returns trigger
language plpgsql
security invoker
set search_path = public as $$
begin
  if new.from_state = 'VERIFYING' and new.to_state = 'ALLOCATIONS_FROZEN'
    and (
      exists (
        select 1 from public.campaign_referrals
        where campaign_id = new.campaign_id
          and status = 'QUALIFIED'
          and bonus_xp_ledger_id is null
      )
      or exists (
        select 1 from public.campaign_x_invite_events
        where campaign_id = new.campaign_id
          and bonus_xp_ledger_id is null
      )
    )
  then
    raise exception 'all exact campaign bonuses must settle before allocations freeze';
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_bonus_queue_before_freeze
  on public.campaign_state_transitions;
create trigger campaign_bonus_queue_before_freeze
before insert on public.campaign_state_transitions
for each row execute function public.guard_campaign_bonus_queue_before_freeze();

revoke all on function public.guard_campaign_bonus_queue_before_freeze()
  from public, anon, authenticated;

create or replace function public.settle_campaign_bonus_award(
  p_campaign_id text,
  p_bonus_kind text,
  p_source_id bigint
) returns jsonb
language plpgsql
security invoker
set search_path = public as $$
declare
  campaign_row public.campaigns;
  rules_row public.ruleset_versions;
  referral_row public.campaign_referrals;
  invite_row public.campaign_x_invite_events;
  cycle_row public.cycles;
  ledger_row public.xp_ledger;
  participant_id bigint;
  source_at timestamptz;
  bonus_amount integer;
  mission text;
  ledger_key text;
  settlement_day date;
  day_start timestamptz;
  day_end timestamptz;
  used_xp bigint;
begin
  if p_bonus_kind is null or p_bonus_kind not in ('VERIFIED_REFERRAL', 'X_INVITE') then
    raise exception 'unsupported campaign bonus kind';
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;

  if not found or campaign_row.state not in ('ACTIVE', 'VERIFYING') then
    raise exception 'campaign is not accepting bonus settlement';
  end if;

  select * into rules_row
  from public.ruleset_versions
  where campaign_id = campaign_row.id
    and version = campaign_row.ruleset_version;

  if not found
    or rules_row.rules_hash <> campaign_row.rules_hash
    or rules_row.rules_json->>'status' <> 'FINAL'
    or rules_row.rules_json#>>'{rulesetVersion}' <> campaign_row.ruleset_version::text
    or rules_row.rules_json#>>'{xpCaps,overallDaily}' <> '75'
    or rules_row.rules_json#>>'{referrals,bonusXp}' <> '10'
    or rules_row.rules_json#>>'{referrals,xInviteBonusXp}' <> '5'
    or rules_row.rules_json#>>'{referrals,bonusCapPolicy}' <> 'QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP'
  then
    raise exception 'campaign FINAL rules do not authorize exact queued bonus settlement';
  end if;

  if p_bonus_kind = 'VERIFIED_REFERRAL' then
    select * into referral_row
    from public.campaign_referrals
    where id = p_source_id and campaign_id = p_campaign_id
    for update;

    if not found
      or referral_row.status not in ('QUALIFIED', 'BONUS_AWARDED')
      or referral_row.identity_verified_at is null
      or referral_row.purchase_verified_at is null
      or referral_row.first_xp_ledger_id is null
      or referral_row.qualified_at is null
      or referral_row.qualifying_purchase_usd < 2
    then
      raise exception 'referral is not qualified for bonus settlement';
    end if;

    participant_id := referral_row.referrer_user_id;
    source_at := referral_row.qualified_at;
    bonus_amount := 10;
    mission := 'verified-referral';
    ledger_key := 'referral-bonus:' || referral_row.id::text;
  else
    select * into invite_row
    from public.campaign_x_invite_events
    where id = p_source_id and campaign_id = p_campaign_id
    for update;

    if not found
      or invite_row.verified_at is null
      or jsonb_typeof(invite_row.mentions) <> 'array'
      or jsonb_array_length(invite_row.mentions) <> 3
      or invite_row.main_post_id <> rules_row.rules_json#>>'{referrals,xInviteMainPostId}'
    then
      raise exception 'X invite is not verified against the FINAL official campaign post';
    end if;

    participant_id := invite_row.telegram_user_id;
    source_at := invite_row.verified_at;
    bonus_amount := 5;
    mission := 'x-invite-three';
    ledger_key := 'x-invite-bonus:' || invite_row.id::text;
  end if;

  select * into cycle_row
  from public.cycles
  where campaign_id = p_campaign_id
    and source_at >= opens_at
    and source_at < closes_at
  order by cycle_id
  limit 1;

  if not found then
    raise exception 'bonus evidence is outside a locked campaign cycle';
  end if;

  if (p_bonus_kind = 'VERIFIED_REFERRAL' and referral_row.bonus_xp_ledger_id is not null)
    or (p_bonus_kind = 'X_INVITE' and invite_row.bonus_xp_ledger_id is not null)
  then
    select * into ledger_row
    from public.xp_ledger
    where id = case when p_bonus_kind = 'VERIFIED_REFERRAL'
      then referral_row.bonus_xp_ledger_id else invite_row.bonus_xp_ledger_id end;

    if not found
      or ledger_row.campaign_id <> p_campaign_id
      or ledger_row.cycle_id <> cycle_row.cycle_id
      or ledger_row.telegram_user_id <> participant_id
      or ledger_row.source <> 'mission'
      or ledger_row.cap_bucket <> 'other'
      or ledger_row.amount <> bonus_amount
      or ledger_row.mission_code <> mission
      or ledger_row.idempotency_key <> ledger_key
    then
      raise exception 'existing bonus ledger link does not match exact award terms';
    end if;

    return jsonb_build_object(
      'status', 'ALREADY_AWARDED', 'amount', bonus_amount, 'ledgerId', ledger_row.id
    );
  end if;

  settlement_day := (now() at time zone 'America/Vancouver')::date;
  day_start := settlement_day::timestamp at time zone 'America/Vancouver';
  day_end := (settlement_day + 1)::timestamp at time zone 'America/Vancouver';

  perform pg_advisory_xact_lock(hashtextextended(
    p_campaign_id || ':' || participant_id::text || ':' || settlement_day::text,
    0
  ));

  -- Other XP paths do not yet share the participant advisory key. This short
  -- table lock serializes their inserts around the cap sum, so a concurrent
  -- award cannot make this exact bonus exceed the overall daily limit.
  lock table public.xp_ledger in share row exclusive mode;

  select coalesce(sum(amount), 0) into used_xp
  from public.xp_ledger
  where campaign_id = p_campaign_id
    and telegram_user_id = participant_id
    and awarded_at >= day_start
    and awarded_at < day_end
    and amount > 0;

  if used_xp + bonus_amount > 75 then
    return jsonb_build_object(
      'status', 'QUEUED_DAILY_CAP', 'amount', 0, 'usedXp', used_xp,
      'requiredRoom', bonus_amount
    );
  end if;

  insert into public.xp_ledger (
    campaign_id, cycle_id, telegram_user_id, source, cap_bucket,
    amount, mission_code, idempotency_key, awarded_at
  ) values (
    p_campaign_id, cycle_row.cycle_id, participant_id, 'mission', 'other',
    bonus_amount, mission, ledger_key, now()
  ) on conflict (campaign_id, idempotency_key) do nothing
  returning * into ledger_row;

  if ledger_row.id is null then
    select * into ledger_row
    from public.xp_ledger
    where campaign_id = p_campaign_id and idempotency_key = ledger_key;
  end if;

  if ledger_row.id is null
    or ledger_row.cycle_id <> cycle_row.cycle_id
    or ledger_row.telegram_user_id <> participant_id
    or ledger_row.source <> 'mission'
    or ledger_row.cap_bucket <> 'other'
    or ledger_row.amount <> bonus_amount
    or ledger_row.mission_code <> mission
  then
    raise exception 'bonus idempotency key is bound to different award terms';
  end if;

  if p_bonus_kind = 'VERIFIED_REFERRAL' then
    update public.campaign_referrals
    set bonus_xp_ledger_id = ledger_row.id,
        status = 'BONUS_AWARDED'
    where id = referral_row.id
      and campaign_id = p_campaign_id
      and status = 'QUALIFIED'
      and bonus_xp_ledger_id is null;
    if not found then raise exception 'referral bonus link changed during settlement'; end if;
  else
    update public.campaign_x_invite_events
    set bonus_xp_ledger_id = ledger_row.id
    where id = invite_row.id
      and campaign_id = p_campaign_id
      and bonus_xp_ledger_id is null;
    if not found then raise exception 'X invite bonus link changed during settlement'; end if;
  end if;

  return jsonb_build_object(
    'status', 'AWARDED', 'amount', bonus_amount, 'ledgerId', ledger_row.id,
    'cycleId', cycle_row.cycle_id, 'settlementDay', settlement_day
  );
end;
$$;

revoke all on function public.settle_campaign_bonus_award(text,text,bigint)
  from public, anon, authenticated;
grant execute on function public.settle_campaign_bonus_award(text,text,bigint)
  to service_role;
