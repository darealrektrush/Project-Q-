import { createHash } from 'node:crypto';

import { inspectBondCampaignRules } from './rules.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function validIso(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function buildBondRulesReconciliation({
  campaign = null,
  liveRulesets = [],
  repoRules = null,
} = {}) {
  const blockers = [];
  const warnings = [];

  const orderedLive = [...(liveRulesets || [])].sort((a, b) => Number(a.version) - Number(b.version));
  const latestLive = orderedLive.at(-1) || null;
  const liveVersion = Number(latestLive?.version || 0);
  const campaignVersion = Number(campaign?.ruleset_version || 0);
  const repoVersion = Number(repoRules?.rulesetVersion || 0);
  const repoHash = repoRules ? hash(repoRules) : null;

  if (!campaign) blockers.push('live campaign row is missing');
  if (!repoRules) blockers.push('reviewed repository rules are missing');

  if (campaign && latestLive && campaignVersion !== liveVersion) {
    blockers.push('campaign ruleset_version does not match latest live ruleset row');
  }
  if (campaign && latestLive && String(campaign.rules_hash || '') !== String(latestLive.rules_hash || '')) {
    blockers.push('campaign rules hash does not match selected live ruleset');
  }
  if (repoVersion <= liveVersion) {
    blockers.push('repository ruleset version must advance beyond the latest live version');
  }

  if (repoRules) {
    if (repoRules.status !== 'FINAL') blockers.push('repository rules are still DRAFT');

    const schedule = repoRules.schedule || {};
    const scheduleFields = [
      schedule.activeOpensAt,
      schedule.activeClosesAt,
      schedule.reviewOpensAt,
      schedule.review48HourCheckpointAt,
      schedule.reviewClosesAt,
    ];
    if (!scheduleFields.every(validIso)) {
      blockers.push('final campaign timestamps are not selected');
    }

    if (!/^[0-9]{1,24}$/.test(String(repoRules?.referrals?.xInviteMainPostId || ''))) {
      blockers.push('official pinned X invite post ID is not finalized');
    }

    const buyToEarn = repoRules.buyToEarn;
    if (!buyToEarn || typeof buyToEarn !== 'object') {
      blockers.push('Buy-to-Earn economic treatment is not defined in final rules');
    } else {
      const mode = String(buyToEarn.mode || '');
      if (!['WEIGHT_ONLY','SEPARATE_POOL'].includes(mode)) {
        blockers.push('Buy-to-Earn mode must be WEIGHT_ONLY or SEPARATE_POOL');
      }
      if (mode === 'SEPARATE_POOL') {
        const pool = String(buyToEarn.poolBaseUnits || '');
        const source = String(buyToEarn.fundingSource || '');
        if (!/^\d+$/.test(pool) || BigInt(pool) <= 0n || !source) {
          blockers.push('separate Buy-to-Earn pool requires exact amount and funding source');
        }
      }
      if (mode === 'WEIGHT_ONLY' && buyToEarn.poolBaseUnits != null && String(buyToEarn.poolBaseUnits) !== '0') {
        blockers.push('weight-only Buy-to-Earn cannot reserve a token payout pool');
      }
      if (Number(buyToEarn.tier1NetBuySol) !== 0.07 || Number(buyToEarn.tier2NetBuySol) !== 0.20) {
        blockers.push('Buy-to-Earn thresholds must remain 0.07 SOL and 0.20 SOL');
      }
    }

    const inspection = inspectBondCampaignRules(repoRules);
    for (const blocker of inspection.blockers || []) {
      if (!blockers.includes(blocker)) blockers.push(blocker);
    }

    if (repoHash && repoHash !== inspection.rulesHash) {
      warnings.push('local canonical hash differs from campaign rules hash helper');
    }
  }

  if (liveVersion === 1 && repoVersion >= 4) {
    warnings.push('live database remains on historical v1 while repository draft has advanced; finalization must be append-only');
  }

  return {
    campaignId: String(campaign?.id || repoRules?.campaignId || 'bond-the-duck-2026'),
    campaignState: String(campaign?.state || 'UNKNOWN'),
    campaignVersion,
    liveVersion,
    liveHash: latestLive?.rules_hash || null,
    repoVersion,
    repoStatus: repoRules?.status || null,
    repoHash,
    readyForFinalProposal: blockers.length === 0,
    blockers,
    warnings,
    mutationsPerformed: false,
  };
}
