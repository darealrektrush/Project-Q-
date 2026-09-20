import { inspectBondCampaignRules } from './rules.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function prepareBondFinalRulesPacket({
  campaign,
  reviewedDraft,
  activeOpensAt,
  xInviteMainPostId,
  now = new Date(),
} = {}) {
  if (!campaign || !reviewedDraft) throw new Error('campaign and reviewed draft are required');
  if (!['DRAFT','READINESS_BLOCKED'].includes(String(campaign.state || ''))) {
    throw new Error('campaign is not in a final-rules preparation state');
  }

  const currentVersion = Number(campaign.ruleset_version);
  if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) {
    throw new Error('live campaign ruleset version is invalid');
  }

  const opensMs = Date.parse(activeOpensAt);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(opensMs) || !Number.isFinite(nowMs) || opensMs <= nowMs) {
    throw new Error('launch start must be a valid future timestamp');
  }
  const postId = String(xInviteMainPostId || '').trim();
  if (!/^[0-9]{1,24}$/.test(postId)) throw new Error('valid pinned X campaign post ID is required');

  const rules = clone(reviewedDraft);
  const nextVersion = currentVersion + 1;

  rules.rulesetVersion = nextVersion;
  rules.status = 'FINAL';
  rules.schedule = {
    ...rules.schedule,
    activeOpensAt: new Date(opensMs).toISOString(),
    activeClosesAt: new Date(opensMs + 10 * DAY_MS).toISOString(),
    reviewOpensAt: new Date(opensMs + 11 * DAY_MS).toISOString(),
    review48HourCheckpointAt: new Date(opensMs + 13 * DAY_MS).toISOString(),
    reviewClosesAt: new Date(opensMs + 14 * DAY_MS).toISOString(),
    activeDays: 10,
    cycleHours: 48,
    cycleCount: 5,
    timeZone: 'America/Vancouver',
  };
  rules.referrals = {
    ...rules.referrals,
    xInviteMainPostId: postId,
  };

  const inspection = inspectBondCampaignRules(rules);
  if (!inspection.valid) {
    throw new Error(`prepared final rules are invalid: ${inspection.blockers.join('; ')}`);
  }

  const cycleStarts = Array.from({ length: 5 }, (_, index) =>
    new Date(opensMs + index * 48 * HOUR_MS).toISOString()
  );
  const cycles = cycleStarts.map((opensAt, index) => ({
    cycleId: index + 1,
    opensAt,
    closesAt: new Date(Date.parse(opensAt) + 48 * HOUR_MS).toISOString(),
  }));

  return {
    campaignId: rules.campaignId,
    liveVersion: currentVersion,
    finalVersion: nextVersion,
    rulesHash: inspection.rulesHash,
    rules,
    cycles,
    mutationsPerformed: false,
  };
}
