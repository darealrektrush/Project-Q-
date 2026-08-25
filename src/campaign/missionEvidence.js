import { DEFAULT_CAMPAIGN_ID } from './service.js';

const EVIDENCE_VISIBLE_STATES = new Set([
  'ACTIVE', 'PAUSED', 'VERIFYING', 'ALLOCATIONS_FROZEN',
  'DISTRIBUTING', 'COMPLETED', 'ARCHIVED',
]);

function campaignId() {
  return process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function emptyLane(target = 0) {
  return { verified: 0, pending: 0, rejected: 0, target };
}

export function closedMissionEvidence(campaignState = 'DRAFT', reason = 'Mission evidence opens with the campaign.') {
  return {
    available: false,
    campaignState,
    generatedAt: null,
    reason,
    oracleRaids: emptyLane(5),
    websiteVoting: emptyLane(9),
    trendingBots: emptyLane(4),
  };
}

function summarize(rows, target, { uniqueSources = false } = {}) {
  const accepted = rows.filter(({ credited }) => credited);
  return {
    verified: uniqueSources
      ? new Set(accepted.map(({ source_key }) => source_key).filter(Boolean)).size
      : accepted.length,
    pending: rows.filter(({ credited, reason }) => !credited && !reason).length,
    rejected: rows.filter(({ credited, reason }) => !credited && Boolean(reason)).length,
    target,
  };
}

export async function getParticipantMissionEvidence(
  client,
  telegramUserId,
  { now = new Date().toISOString() } = {}
) {
  const id = campaignId();
  const userId = String(telegramUserId);
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(id)}&select=state&limit=1`
  );
  const campaignState = campaignRows[0]?.state ?? 'DRAFT';
  if (!EVIDENCE_VISIBLE_STATES.has(campaignState)) return closedMissionEvidence(campaignState);

  const parsedNow = new Date(now);
  if (Number.isNaN(parsedNow.getTime())) throw new Error('invalid mission evidence timestamp');
  const day = parsedNow.toISOString().slice(0, 10);
  const start = `${day}T00:00:00.000Z`;
  const end = `${day}T23:59:59.999999Z`;
  const participantFilter = `?campaign_id=eq.${encodeURIComponent(id)}` +
    `&telegram_user_id=eq.${encodeURIComponent(userId)}`;

  const [raidRows, voteRows, botRows, sourceRows] = await Promise.all([
    client.select(
      'campaign_raid_events',
      `${participantFilter}&verified_at=gte.${encodeURIComponent(start)}` +
        `&verified_at=lt.${encodeURIComponent(end)}` +
        '&select=credited,reason&limit=100'
    ),
    client.select(
      'campaign_participation_events',
      `${participantFilter}&source=eq.vote&select=source_key,credited,reason&limit=1000`
    ),
    client.select(
      'campaign_participation_events',
      `${participantFilter}&source=eq.event&verified_at=gte.${encodeURIComponent(start)}` +
        `&verified_at=lt.${encodeURIComponent(end)}` +
        '&select=source_key,credited,reason&limit=100'
    ),
    client.select(
      'verification_sources',
      `?campaign_id=eq.${encodeURIComponent(id)}` +
        '&classification=not.in.(SOURCE_UNAVAILABLE,REMOVED_FOR_INTEGRITY)' +
        '&select=source_key,source&limit=100'
    ),
  ]);
  const voteTarget = sourceRows.filter(({ source }) => source === 'vote').length;
  const botTarget = sourceRows.filter(({ source }) => source === 'event').length;

  return {
    available: true,
    campaignState,
    generatedAt: parsedNow.toISOString(),
    reason: null,
    oracleRaids: summarize(raidRows, 5),
    websiteVoting: summarize(voteRows, voteTarget, { uniqueSources: true }),
    trendingBots: summarize(botRows, botTarget, { uniqueSources: true }),
  };
}
