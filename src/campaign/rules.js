import { hashRuleset } from './state.js';

export const BOND_RULES_SCHEMA = 'bond-campaign-rules-v1';
export const BOND_RULES_MISSION_IDS = Object.freeze([
  'oracle-raids',
  'website-voting',
  'trending-bots',
  'bagwork',
  'buy-to-earn',
  'participation-xp',
  'community-pulse',
  'verified-referrals',
  'earn-to-burn',
]);
export const BOND_RULES_TELEGRAM_BOTS = Object.freeze([
  '@majorbuybot',
  '@wtftrending',
  '@trenchobot',
  '@BBtrendingbot',
  '@drokiatrendsbot',
]);
export const BOND_RULES_TELEGRAM_BOT_COOLDOWNS = Object.freeze({
  '@majorbuybot': 7200,
  '@wtftrending': 3600,
  '@trenchobot': 86400,
  '@BBtrendingbot': 3600,
  '@drokiatrendsbot': 3600,
});
export const BOND_RULES_TELEGRAM_BOT_COOLDOWN_CERTIFICATION = Object.freeze({
  '@majorbuybot': 'OBSERVED',
  '@wtftrending': 'OBSERVED',
  '@trenchobot': 'OBSERVED',
  '@BBtrendingbot': 'OBSERVED',
  '@drokiatrendsbot': 'OBSERVED',
});
export const BOND_RULES_WEBSITE_VOTING = Object.freeze([
  { sourceKey: 'web:geckoterminal', name: 'GeckoTerminal', url: 'https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM', verificationMode: 'AGGREGATE_ONLY', classification: 'COMMUNITY_PROGRESS_ONLY', certificationStatus: 'OBSERVED_NO_USER_RECEIPT', cooldownSeconds: 86400, individualXpEligible: false },
  { sourceKey: 'web:top100token', name: 'Top100Token', url: 'https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump', verificationMode: 'PENDING_LIVE_TEST', classification: 'SOURCE_UNAVAILABLE', certificationStatus: 'CLOUDFLARE_BLOCKED', cooldownSeconds: 86400, individualXpEligible: false },
  { sourceKey: 'web:coinmooner', name: 'CoinMooner', url: 'https://coinmooner.com/coins/fawk-q-fawkq', verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED', certificationStatus: 'OBSERVED_24H', cooldownSeconds: 86400, individualXpEligible: true },
  { sourceKey: 'web:gemfinder', name: 'GemFinder', url: 'https://gemfinder.cc/gem/29742', verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED', certificationStatus: 'OBSERVED_24H', cooldownSeconds: 86400, individualXpEligible: true },
  { sourceKey: 'web:coinsniper', name: 'CoinSniper', url: 'https://coinsniper.net/coin/92949', verificationMode: 'PENDING_LIVE_TEST', classification: 'SOURCE_UNAVAILABLE', certificationStatus: 'CLOUDFLARE_BLOCKED', cooldownSeconds: 86400, individualXpEligible: false },
  { sourceKey: 'web:coinmun', name: 'CoinMun', url: 'https://coinmun.com/coins/fawk-q', verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED', certificationStatus: 'OBSERVED_24H', cooldownSeconds: 86400, individualXpEligible: true },
  { sourceKey: 'web:coinboom', name: 'CoinBoom', url: 'https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump', verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE', certificationStatus: 'NO_FREE_VOTE_OBSERVED', cooldownSeconds: 86400, individualXpEligible: false },
  { sourceKey: 'web:coinbuzzer', name: 'CoinBuzzer', url: 'https://coinbuzzer.me/coin/860', verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE', certificationStatus: 'OFFLINE', cooldownSeconds: 86400, individualXpEligible: false },
  { sourceKey: 'web:coinscope', name: 'CoinScope', url: 'https://www.coinscope.co/coin/fawkq', verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE', certificationStatus: 'OFFLINE', cooldownSeconds: 86400, individualXpEligible: false },
]);

const POSITIVE_INTEGER = (value) => Number.isInteger(value) && value > 0;
const POSITIVE_XP = (value) => POSITIVE_INTEGER(value) && value <= 75;

export function inspectBondCampaignRules(rules, { requireFinal = true } = {}) {
  const blockers = [];
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    return { valid: false, blockers: ['ruleset must be a JSON object'], rulesHash: null };
  }
  if (rules.schema !== BOND_RULES_SCHEMA) blockers.push('rules schema is not recognized');
  if (rules.campaignId !== 'bond-the-duck-2026') blockers.push('campaign identity is not locked');
  if (!POSITIVE_INTEGER(rules.rulesetVersion)) blockers.push('ruleset version is invalid');
  if (requireFinal && rules.status !== 'FINAL') blockers.push('ruleset status is not FINAL');

  const schedule = rules.schedule || {};
  if (schedule.timeZone !== 'America/Vancouver'
    || schedule.activeOpensAt !== '2026-09-01T15:00:00.000Z'
    || schedule.activeClosesAt !== '2026-09-15T15:00:00.000Z'
    || schedule.activeDays !== 14 || schedule.cycleHours !== 48 || schedule.cycleCount !== 7
    || schedule.reviewOpensAt !== '2026-09-16T15:00:00.000Z'
    || schedule.review48HourCheckpointAt !== '2026-09-18T15:00:00.000Z'
    || schedule.reviewClosesAt !== '2026-09-19T15:00:00.000Z') {
    blockers.push('campaign and review schedule is not the locked September window');
  }

  const commitments = rules.commitments || {};
  if (commitments.campaignRewardsBaseUnits !== '15000000000000'
    || commitments.campaignFounderCount !== 2
    || commitments.campaignPerFounderBaseUnits !== '7500000000000'
    || commitments.diamondDuckBaseUnits !== '2500000000000'
    || commitments.diamondDuckPerFounderBaseUnits !== '1250000000000'
    || commitments.topContributorLamports !== '1000000000'
    || commitments.earnToBurnBaseUnits !== '15000000000000'
    || commitments.earnToBurnSource !== 'FAWKQ_CREATOR_WALLET'
    || commitments.totalTokenCommitmentBaseUnits !== '32500000000000') {
    blockers.push('campaign commitments do not match the locked allocation model');
  }

  const missionIds = Array.isArray(rules.missions) ? [...rules.missions].sort() : [];
  if (JSON.stringify(missionIds) !== JSON.stringify([...BOND_RULES_MISSION_IDS].sort())) {
    blockers.push('mission catalog is not the exact nine-lane campaign');
  }

  const eligibility = rules.eligibility || {};
  if (!eligibility.telegramRequired || !eligibility.oracleXRequired
    || !eligibility.walletRequiredForRewards || eligibility.minimumFawkqUsd !== 2) {
    blockers.push('verified identity and minimum FAWKQ eligibility rules are incomplete');
  }

  const caps = rules.xpCaps || {};
  if (caps.overallDaily !== 75 || caps.participationDaily !== 15
    || caps.projectQDaily !== 20 || caps.trendingBotsDaily !== 20) {
    blockers.push('daily XP caps do not match the published campaign');
  }

  const verificationSources = rules.verificationSources || {};
  if (verificationSources.websiteVotingCount !== 9
    || JSON.stringify(verificationSources.websiteVoting) !== JSON.stringify(BOND_RULES_WEBSITE_VOTING)
    || verificationSources.telegramBotFirstDailyXp !== 2
    || verificationSources.telegramBotRepeatXp !== 1
    || verificationSources.telegramBotDailyMaximumXp !== 20
    || verificationSources.telegramPushPointPerAcceptedVote !== 1
    || JSON.stringify(verificationSources.telegramBotCooldownSeconds)
      !== JSON.stringify(BOND_RULES_TELEGRAM_BOT_COOLDOWNS)
    || JSON.stringify(verificationSources.telegramBotCooldownCertification)
      !== JSON.stringify(BOND_RULES_TELEGRAM_BOT_COOLDOWN_CERTIFICATION)
    || JSON.stringify(verificationSources.telegramBots) !== JSON.stringify(BOND_RULES_TELEGRAM_BOTS)) {
    blockers.push('verification sources are not the locked nine-site and five-bot campaign set');
  }

  const releases = rules.releases || {};
  if (releases.verifiedActivityPercent !== 25 || releases.postReviewPercent !== 50
    || releases.phasedPercent !== 25 || releases.phasedInstallments !== 5
    || releases.phasedInstallmentPercent !== 5
    || JSON.stringify(releases.phasedOffsetDays) !== JSON.stringify([6, 12, 18, 24, 30])) {
    blockers.push('reward release schedule is incomplete');
  }

  const referrals = rules.referrals || {};
  if (referrals.minimumPurchaseUsd !== 2) blockers.push('referral purchase minimum is not USD $2');
  if (!POSITIVE_XP(referrals.bonusXp)) blockers.push('verified referral bonus XP is not finalized');
  if (!/^[0-9]{1,24}$/.test(String(referrals.xInviteMainPostId || ''))) {
    blockers.push('official pinned FAWKQ campaign post ID is not finalized');
  }
  if (referrals.xInviteRequiredDistinctMentions !== 3) blockers.push('X invite requirement is not exactly three friends');
  if (!POSITIVE_XP(referrals.xInviteBonusXp)) blockers.push('X invite bonus XP is not finalized');

  const burn = rules.earnToBurn || {};
  if (burn.programId !== 'fawkq-earn-to-burn'
    || burn.openingBurnBaseUnits !== '15000000000000'
    || burn.openingBurnType !== 'CREATOR_WALLET_RESERVE') {
    blockers.push('Earn to Burn opening commitment is not locked');
  }
  if (!Array.isArray(burn.milestones) || burn.milestones.length === 0) {
    blockers.push('Earn to Burn milestones are not finalized');
  } else {
    try {
      let priorTarget = 0n;
      let totalBurn = 0n;
      const milestoneIds = new Set();
      for (const milestone of burn.milestones) {
        const id = String(milestone?.id || '');
        const target = BigInt(milestone?.progressTargetUnits || 0);
        const amount = BigInt(milestone?.burnAmountBaseUnits || 0);
        if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id) || milestoneIds.has(id)
          || target <= priorTarget || amount <= 0n) {
          throw new Error('invalid milestone');
        }
        milestoneIds.add(id);
        priorTarget = target;
        totalBurn += amount;
      }
      if (totalBurn !== 15_000_000_000_000n) throw new Error('burn total mismatch');
    } catch {
      blockers.push('Earn to Burn milestones do not form a unique ordered 15,000,000 FAWKQ plan');
    }
  }

  return { valid: blockers.length === 0, blockers, rulesHash: hashRuleset(rules) };
}

export function rulesetRowMatchesCampaign(campaign, rulesetRow) {
  if (!campaign || !rulesetRow) return false;
  const inspection = inspectBondCampaignRules(rulesetRow.rules_json);
  return inspection.valid
    && Number(rulesetRow.version) === Number(campaign.ruleset_version)
    && Number(rulesetRow.rules_json?.rulesetVersion) === Number(rulesetRow.version)
    && rulesetRow.rules_hash === campaign.rules_hash
    && inspection.rulesHash === campaign.rules_hash;
}
