import { secretMatches } from './oracleIngest.js';

const PROFILE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeActivity(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, 25).map((row) => ({
    cycleId: Number(row.cycleId ?? 0),
    source: String(row.source ?? ''),
    bucket: String(row.bucket ?? ''),
    amount: Number(row.amount ?? 0),
    missionCode: row.missionCode == null ? null : String(row.missionCode),
    awardedAt: row.awardedAt ?? null,
  }));
}

function safeReleases(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, 100).map((row) => ({
    category: String(row.category ?? 'other'),
    cycleId: row.cycleId == null ? null : Number(row.cycleId),
    percent: Number(row.percent ?? 0),
    scheduledAt: row.scheduledAt ?? null,
    amountBaseUnits: String(row.amountBaseUnits ?? '0'),
    status: String(row.status ?? ''),
    transactionSignature: row.transactionSignature ?? null,
    confirmedBlockTime: row.confirmedBlockTime ?? null,
    reconciliationStatus: row.reconciliationStatus ?? null,
  }));
}

function readiness(status) {
  if (!status.enrolled) {
    return { state: 'not_enrolled', missingRequirements: ['campaign enrollment'] };
  }
  const missingRequirements = [];
  if (!status.xVerified) missingRequirements.push('verified X connection');
  if (!status.walletVerified) missingRequirements.push('verified Oracle wallet');
  return {
    state: missingRequirements.length ? 'action_required' : 'identity_ready',
    missingRequirements,
  };
}

function projectParticipant(campaignId, profileId, status, observedAt) {
  const rewards = status.rewards ?? {};
  const position = status.buyToEarn;
  return {
    profileId,
    campaignId,
    campaignState: String(status.campaignState ?? 'DRAFT'),
    enrolled: Boolean(status.enrolled),
    enrolledAt: status.enrolledAt ?? null,
    xVerified: Boolean(status.xVerified),
    walletVerified: Boolean(status.walletVerified),
    campaignReady: Boolean(status.campaignReady),
    holderEligible: Boolean(status.holderEligible),
    rewardEligible: Boolean(status.rewardEligible),
    campaignReadiness: readiness(status),
    totalXp: Number(status.totalXp ?? 0),
    todayXp: Number(status.todayXp ?? 0),
    todayXpByBucket: status.todayXpByBucket ?? {},
    xpByBucket: status.xpByBucket ?? {},
    recentActivity: safeActivity(status.recentActivity),
    completedMissionCodes: Array.isArray(status.completedMissionCodes)
      ? status.completedMissionCodes.slice(0, 100).map(String)
      : [],
    completedMissionCount: Number(status.completedMissionCount ?? 0),
    allocationBaseUnits: status.allocationBaseUnits == null
      ? null
      : String(status.allocationBaseUnits),
    allocationByCategory: status.allocationByCategory ?? {},
    rewards: {
      recorded: Boolean(rewards.recorded),
      allocatedBaseUnits: rewards.allocatedBaseUnits == null
        ? null
        : String(rewards.allocatedBaseUnits),
      scheduledBaseUnits: rewards.scheduledBaseUnits == null
        ? null
        : String(rewards.scheduledBaseUnits),
      distributedBaseUnits: rewards.distributedBaseUnits == null
        ? null
        : String(rewards.distributedBaseUnits),
      failedBaseUnits: rewards.failedBaseUnits == null
        ? null
        : String(rewards.failedBaseUnits),
      releaseCount: Number(rewards.releaseCount ?? 0),
      receiptCount: Number(rewards.receiptCount ?? 0),
      releases: safeReleases(rewards.releases),
    },
    buyToEarn: position ? {
      eligibleBoughtBaseUnits: String(position.eligible_bought_base_units ?? '0'),
      eligibleSoldBaseUnits: String(position.eligible_sold_base_units ?? '0'),
      netBuyLamports: String(position.net_buy_lamports ?? '0'),
      tier: position.tier == null ? null : Number(position.tier),
      weight: Number(position.weight ?? 0),
      snapshotUsd: position.snapshot_usd == null ? null : String(position.snapshot_usd),
      eligible: Boolean(position.eligible),
    } : null,
    observedAt,
  };
}

export function universeCampaignProfileHandler({
  secret,
  enabled = false,
  campaignId = 'bond-the-duck-2026',
  getParticipantStatusByProfile,
  now = () => new Date(),
}) {
  return async (req, res) => {
    res.set('Cache-Control', 'private, no-store');

    if (!secretMatches(req.get('x-universe-project-q-secret'), secret)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    if (!enabled) {
      return res.status(503).json({ ok: false, error: 'Universe campaigns disabled' });
    }
    if (req.params?.campaignId !== campaignId) {
      return res.status(404).json({ ok: false, error: 'campaign not found' });
    }

    const body = req.body ?? {};
    const keys = Object.keys(body);
    const profileId = body.profile_id;
    if (
      keys.length !== 1 ||
      keys[0] !== 'profile_id' ||
      typeof profileId !== 'string' ||
      !PROFILE_ID_RE.test(profileId)
    ) {
      return res.status(400).json({ ok: false, error: 'invalid profile_id' });
    }

    try {
      const status = await getParticipantStatusByProfile(profileId);
      if (status?.unavailable) throw new Error('unavailable');
      if (status?.profileId !== profileId) throw new Error('profile mismatch');
      return res.status(200).json({
        ok: true,
        profile: projectParticipant(
          campaignId,
          profileId,
          status,
          now().toISOString()
        ),
      });
    } catch {
      return res.status(503).json({
        ok: false,
        error: 'campaign profile unavailable',
      });
    }
  };
}
