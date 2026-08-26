import { DEFAULT_CAMPAIGN_ID } from './service.js';

const VISIBLE_RANKING_STATES = new Set([
  'ACTIVE', 'PAUSED', 'VERIFYING', 'ALLOCATIONS_FROZEN',
  'DISTRIBUTING', 'COMPLETED', 'ARCHIVED',
]);
const DEFAULT_LIMIT = 20;

function campaignId() {
  return process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function emptyView(reason, available = false, unit = 'XP') {
  return { available, reason, rows: [], participantRank: null, participantXp: 0, participantCount: 0, unit };
}

export function closedCampaignLeaderboards(state = 'DRAFT', reason = 'Rankings open when the campaign is active.') {
  return {
    available: false,
    campaignState: state,
    generatedAt: null,
    overall: emptyView(reason),
    '48h': emptyView(reason),
    missions: emptyView(reason),
    trending: emptyView(reason, false, 'PUSHES'),
    community: emptyView(reason),
    burn: emptyView('Earn-to-Burn contributor attribution is not finalized.'),
  };
}

function countRows(rows, allowedIds) {
  const totals = new Map();
  for (const row of rows) {
    const userId = String(row.telegram_user_id ?? '');
    if (!userId || !allowedIds.has(userId)) continue;
    totals.set(userId, (totals.get(userId) ?? 0) + 1);
  }
  return totals;
}

function addRows(rows, amountField, allowedIds) {
  const totals = new Map();
  for (const row of rows) {
    const userId = String(row.telegram_user_id ?? '');
    if (!userId || !allowedIds.has(userId)) continue;
    const amount = Number(row[amountField] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totals.set(userId, (totals.get(userId) ?? 0) + amount);
  }
  return totals;
}

function compareUserIds(a, b) {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const left = BigInt(a);
    const right = BigInt(b);
    return left < right ? -1 : left > right ? 1 : 0;
  }
  return a.localeCompare(b);
}

function makeView(totals, requesterId, detail, limit = DEFAULT_LIMIT, unit = 'XP') {
  const ranked = [...totals.entries()]
    .map(([userId, xp]) => ({ userId, xp }))
    .sort((a, b) => b.xp - a.xp || compareUserIds(a.userId, b.userId))
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const participant = ranked.find(({ userId }) => userId === requesterId) ?? null;
  const selected = ranked.slice(0, limit);
  if (participant && participant.rank > limit) selected.push(participant);

  return {
    available: true,
    reason: null,
    participantRank: participant?.rank ?? null,
    participantXp: participant?.xp ?? 0,
    participantCount: ranked.length,
    unit,
    rows: selected.map(({ userId, xp, rank }) => ({
      rank,
      xp,
      isUser: userId === requesterId,
      name: userId === requesterId ? 'YOU' : `Verified Duck ${String(rank).padStart(2, '0')}`,
      detail,
    })),
  };
}

export async function getCampaignLeaderboards(
  client,
  telegramUserId,
  { now = new Date().toISOString(), limit = DEFAULT_LIMIT } = {}
) {
  const id = campaignId();
  const requesterId = String(telegramUserId);
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(id)}&select=state&limit=1`
  );
  const state = campaignRows[0]?.state ?? 'DRAFT';
  if (!VISIBLE_RANKING_STATES.has(state)) return closedCampaignLeaderboards(state);

  const since = new Date(new Date(now).getTime() - 48 * 60 * 60 * 1000).toISOString();
  const [identityRows, overallRows, recentRows, trendingRows, missionRows, communityRows] = await Promise.all([
    client.select(
      'identity_links',
      `?campaign_id=eq.${encodeURIComponent(id)}&x_verified_at=not.is.null&select=telegram_user_id&limit=10000`
    ),
    client.select(
      'campaign_xp_totals',
      `?campaign_id=eq.${encodeURIComponent(id)}&select=telegram_user_id,xp&limit=10000`
    ),
    client.select(
      'xp_ledger',
      `?campaign_id=eq.${encodeURIComponent(id)}&awarded_at=gte.${encodeURIComponent(since)}` +
        '&select=telegram_user_id,amount&limit=10000'
    ),
    client.select(
      'campaign_participation_events',
      `?campaign_id=eq.${encodeURIComponent(id)}&source=eq.event&credited=eq.true` +
        '&select=telegram_user_id&limit=10000'
    ),
    client.select(
      'xp_ledger',
      `?campaign_id=eq.${encodeURIComponent(id)}&cap_bucket=eq.mission` +
        '&select=telegram_user_id,amount&limit=10000'
    ),
    client.select(
      'campaign_community_daily_scores',
      `?campaign_id=eq.${encodeURIComponent(id)}&eligible=eq.true` +
        '&select=telegram_user_id,xp_awarded&limit=10000'
    ),
  ]);
  const verifiedIds = new Set(identityRows.map(({ telegram_user_id }) => String(telegram_user_id)));

  return {
    available: true,
    campaignState: state,
    generatedAt: now,
    overall: makeView(addRows(overallRows, 'xp', verifiedIds), requesterId, 'Verified campaign XP', limit),
    '48h': makeView(addRows(recentRows, 'amount', verifiedIds), requesterId, 'Verified XP · last 48 hours', limit),
    missions: makeView(addRows(missionRows, 'amount', verifiedIds), requesterId, 'Verified mission XP', limit),
    trending: makeView(
      countRows(trendingRows, verifiedIds), requesterId, 'Accepted Telegram trending pushes', limit, 'PUSHES'
    ),
    community: makeView(addRows(communityRows, 'xp_awarded', verifiedIds), requesterId, 'Qualified Community Pulse XP', limit),
    burn: emptyView('Earn-to-Burn contributor attribution is not finalized.'),
  };
}
