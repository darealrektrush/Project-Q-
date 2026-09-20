import { DEFAULT_CAMPAIGN_ID } from './service.js';
import { selectCycleWinners } from './winnerSelection.js';

function parseIds(value) {
  return new Set(String(value ?? '').split(',').map((id) => id.trim()).filter((id) => /^\d+$/.test(id)));
}

function compareIds(left, right) {
  const a = BigInt(left);
  const b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function latestByTelegram(rows = []) {
  const latest = new Map();
  for (const row of [...rows].sort((a, b) => {
    const at = Date.parse(a.observed_at || 0);
    const bt = Date.parse(b.observed_at || 0);
    if (at !== bt) return bt - at;
    return Number(b.id || 0) - Number(a.id || 0);
  })) {
    const key = String(row.telegram_user_id || '');
    if (key && !latest.has(key)) latest.set(key, row);
  }
  return latest;
}

export function buildCycleWinnerCandidateSnapshot({
  campaignId = DEFAULT_CAMPAIGN_ID,
  cycleId,
  cycle = null,
  drawFinalization = null,
  snapshotAt = new Date(),
  xpRows = [],
  identityRows = [],
  holderRows = [],
  positionRows = [],
  founderRows = [],
  priorWinnerRows = [],
  excludedTelegramIds = [],
} = {}) {
  if (!campaignId || !Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5) {
    throw new Error('invalid campaign cycle');
  }

  const identityByUser = new Map(identityRows.map((row) => [String(row.telegram_user_id), row]));
  const holderByUser = latestByTelegram(holderRows);
  const positionByWallet = new Map(positionRows.map((row) => [String(row.reward_wallet), row]));
  const founderIds = new Set(founderRows.map((row) => String(row.founder_user_id)));
  const cooldownIds = new Set(priorWinnerRows.map((row) => String(row.telegram_user_id)));
  const excludedIds = new Set([...excludedTelegramIds].map(String));

  const candidates = xpRows.map((row) => {
    const telegramUserId = String(row.telegram_user_id ?? '');
    if (!/^\d+$/.test(telegramUserId)) throw new Error('invalid XP candidate identity');
    const score = Number(row.xp);
    if (!Number.isSafeInteger(score) || score < 0) throw new Error('invalid candidate XP score');

    const identity = identityByUser.get(telegramUserId) || null;
    const holder = holderByUser.get(telegramUserId) || null;
    const rewardWallet = identity?.reward_wallet || null;
    const position = rewardWallet ? positionByWallet.get(String(rewardWallet)) || null : null;

    const identityReady = Boolean(
      identity?.profile_id
      && identity?.x_verified_at
      && identity?.wallet_verified_at
      && rewardWallet
    );
    const holderEligible = holder?.eligible === true
      && String(holder?.reward_wallet || '') === String(rewardWallet || '');
    const admin = founderIds.has(telegramUserId) || excludedIds.has(telegramUserId);
    const cooldown = cooldownIds.has(telegramUserId);
    const buyToEarnWeight = position?.eligible === true ? Number(position.weight || 0) : 0;
    if (!Number.isSafeInteger(buyToEarnWeight) || buyToEarnWeight < 0) {
      throw new Error('invalid Buy-to-Earn draw weight');
    }

    return {
      telegramUserId,
      score,
      rewardWallet,
      identityReady,
      holderEligible,
      holderObservedAt: holder?.observed_at || null,
      admin,
      cooldown,
      buyToEarnTier: position?.tier == null ? null : Number(position.tier),
      buyToEarnWeight,
      eligible: score > 0 && identityReady && holderEligible && !admin && !cooldown,
    };
  });

  const rankedEligible = candidates
    .filter(({ eligible }) => eligible)
    .sort((a, b) => b.score - a.score || compareIds(a.telegramUserId, b.telegramUserId));
  const top15 = rankedEligible.slice(0, 15);
  const weightedTop15 = top15.slice(2).filter(({ buyToEarnWeight }) => buyToEarnWeight > 0);

  const snapshotMs = snapshotAt instanceof Date ? snapshotAt.getTime() : Date.parse(snapshotAt);
  const cycleClosed = Boolean(
    Number.isFinite(snapshotMs)
    && cycle?.closes_at
    && Date.parse(cycle.closes_at) <= snapshotMs
  );
  const cutoffReady = Boolean(
    Number(cycle?.cutoff_slot || 0) > 0
    && String(cycle?.cutoff_blockhash || '').trim()
  );
  const publicSeed = /^[0-9a-f]{64}$/.test(String(drawFinalization?.public_seed || ''))
    ? String(drawFinalization.public_seed)
    : null;

  return {
    campaignId,
    cycleId,
    cycleClosed,
    cutoffReady,
    publicSeed,
    fallbackUsed: drawFinalization?.fallback_used === true,
    drawFinalizedAt: drawFinalization?.finalized_at || null,
    selectionEvidenceReady: cycleClosed && cutoffReady && Boolean(publicSeed),
    candidateCount: candidates.length,
    eligibleCount: rankedEligible.length,
    top15Count: top15.length,
    weightedTop15Count: weightedTop15.length,
    cooldownIds: [...cooldownIds].sort(compareIds),
    candidates,
    top15,
    selectionPreconditions: {
      fiveEligibleProfiles: rankedEligible.length >= 5,
      threeWeightedProfilesInRanks3To15: weightedTop15.length >= 3,
    },
  };
}

export function planWeightOnlyCycleSelection(snapshot, {
  publicSeed = snapshot?.publicSeed,
  buyToEarnMode,
} = {}) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('candidate snapshot is required');
  if (buyToEarnMode !== 'WEIGHT_ONLY') {
    throw new Error('winner selection requires finalized WEIGHT_ONLY Buy-to-Earn policy');
  }
  if (!snapshot.selectionEvidenceReady) {
    throw new Error('cycle cutoff and finalized public draw evidence are not ready');
  }
  if (!/^[0-9a-f]{64}$/.test(String(publicSeed || '')) || publicSeed !== snapshot.publicSeed) {
    throw new Error('winner selection seed must match finalized draw evidence');
  }
  if (!snapshot.selectionPreconditions?.fiveEligibleProfiles
    || !snapshot.selectionPreconditions?.threeWeightedProfilesInRanks3To15) {
    throw new Error('winner selection preconditions are not satisfied');
  }

  return selectCycleWinners({
    campaignId: snapshot.campaignId,
    cycleId: snapshot.cycleId,
    profiles: snapshot.candidates.map((candidate) => ({
      telegramUserId: candidate.telegramUserId,
      score: candidate.score,
      weight: candidate.buyToEarnWeight,
      eligible: candidate.eligible,
      admin: candidate.admin,
    })),
    publicSeed,
    priorCycleWinnerIds: snapshot.cooldownIds,
  });
}

export async function loadCycleWinnerCandidateSnapshot(client, {
  campaignId = DEFAULT_CAMPAIGN_ID,
  cycleId,
  env = process.env,
  now = new Date(),
} = {}) {
  if (!Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5) {
    throw new Error('invalid campaign cycle');
  }

  const [campaignRows, cycleRows, xpRows, founderRows, priorWinnerRows, drawFinalizationRows] = await Promise.all([
    client.select('campaigns', `?id=eq.${encodeURIComponent(campaignId)}&select=id,state&limit=1`),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(campaignId)}&cycle_id=eq.${cycleId}&select=cycle_id,opens_at,closes_at,cutoff_slot,cutoff_blockhash,commit_hash,reveal_value,fallback_used,finalized_at&limit=1`),
    client.select('campaign_xp_totals', `?campaign_id=eq.${encodeURIComponent(campaignId)}&cycle_id=eq.${cycleId}&select=telegram_user_id,xp&order=xp.desc`),
    client.select('campaign_founders', `?campaign_id=eq.${encodeURIComponent(campaignId)}&enabled=eq.true&select=founder_user_id`),
    cycleId > 1
      ? client.select('cycle_winners', `?campaign_id=eq.${encodeURIComponent(campaignId)}&cycle_id=eq.${cycleId - 1}&select=telegram_user_id`)
      : Promise.resolve([]),
    client.select(
      'campaign_cycle_draw_finalizations',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&cycle_id=eq.${cycleId}` +
        '&select=public_seed,fallback_used,finalized_at&limit=1'
    ),
  ]);

  const campaign = campaignRows[0] || null;
  const cycle = cycleRows[0] || null;
  const drawFinalization = drawFinalizationRows[0] || null;
  if (!campaign || !['ACTIVE', 'VERIFYING'].includes(campaign.state)) {
    throw new Error('campaign is not in a winner-snapshot state');
  }
  if (!cycle) throw new Error('campaign cycle not found');
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const closesAtMs = Date.parse(cycle.closes_at || '');
  if (!Number.isFinite(nowMs) || !Number.isFinite(closesAtMs) || nowMs < closesAtMs) {
    throw new Error('campaign cycle is not closed');
  }

  const userIds = [...new Set(xpRows.map((row) => String(row.telegram_user_id)).filter((id) => /^\d+$/.test(id)))];
  if (!userIds.length) {
    return {
      ...buildCycleWinnerCandidateSnapshot({
        campaignId, cycleId, cycle, drawFinalization, snapshotAt: now, xpRows, founderRows, priorWinnerRows,
        excludedTelegramIds: [],
      }),
      cycle,
    };
  }

  const userFilter = userIds.join(',');
  const identityRows = await client.select(
    'identity_links',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=in.(${userFilter})` +
      '&select=telegram_user_id,profile_id,reward_wallet,x_verified_at,wallet_verified_at'
  );
  const holderRows = await client.select(
    'campaign_holder_eligibility_events',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=in.(${userFilter})` +
      '&select=id,telegram_user_id,reward_wallet,eligible,observed_at&order=observed_at.desc,id.desc&limit=5000'
  );
  const wallets = [...new Set(identityRows.map((row) => row.reward_wallet).filter(Boolean))];
  const positionRows = wallets.length
    ? await client.select(
      'positions',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&reward_wallet=in.(${wallets.map(encodeURIComponent).join(',')})` +
        '&select=reward_wallet,tier,weight,eligible,net_buy_lamports'
    )
    : [];

  const excludedTelegramIds = [
    ...parseIds(env.TELEGRAM_ADMIN_USER_IDS),
    ...parseIds(env.PROJECT_Q_ACTIVITY_EXCLUDED_TELEGRAM_IDS),
  ];

  return {
    ...buildCycleWinnerCandidateSnapshot({
      campaignId,
      cycleId,
      cycle,
      drawFinalization,
      snapshotAt: now,
      xpRows,
      identityRows,
      holderRows,
      positionRows,
      founderRows,
      priorWinnerRows,
      excludedTelegramIds,
    }),
    cycle,
  };
}
