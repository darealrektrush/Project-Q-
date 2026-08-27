import {
  VERIFIED_REFERRAL_BONUS_XP,
  X_INVITE_BONUS_XP,
} from './rewardValues.js';

const SETTLEMENT_STATES = new Set(['ACTIVE', 'VERIFYING']);

const referralQuery = (campaignId, limit) =>
  `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
  '&status=eq.QUALIFIED&bonus_xp_ledger_id=is.null' +
  '&select=id,qualified_at&order=qualified_at.asc' +
  `&limit=${limit}`;

const xInviteQuery = (campaignId, limit) =>
  `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
  '&bonus_xp_ledger_id=is.null' +
  '&select=id,verified_at&order=verified_at.asc' +
  `&limit=${limit}`;

function normalizeRpcResult(raw, event) {
  const result = Array.isArray(raw) ? raw[0] : raw;
  if (!result || typeof result !== 'object') {
    throw new Error(`bonus settlement returned no result for ${event.kind} ${event.id}`);
  }

  if (result.status === 'QUEUED_DAILY_CAP') {
    return {
      eventId: event.id,
      kind: event.kind,
      credited: false,
      amount: 0,
      reason: 'daily_cap_queue',
    };
  }

  if (!['AWARDED', 'ALREADY_AWARDED'].includes(result.status)) {
    throw new Error(`unknown bonus settlement status ${String(result.status)}`);
  }

  const expectedAmount = event.kind === 'VERIFIED_REFERRAL'
    ? VERIFIED_REFERRAL_BONUS_XP
    : X_INVITE_BONUS_XP;
  const amount = Number(result.amount);
  if (amount !== expectedAmount) {
    throw new Error(
      `bonus settlement amount mismatch for ${event.kind} ${event.id}: expected ${expectedAmount}, got ${result.amount}`
    );
  }

  return {
    eventId: event.id,
    kind: event.kind,
    credited: true,
    amount,
    reason: result.status === 'ALREADY_AWARDED' ? 'already_awarded' : null,
  };
}

export async function settleCampaignBonusXp(client, campaignId, { limit = 200 } = {}) {
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(campaignId)}&select=id,state&limit=1`
  );
  if (!SETTLEMENT_STATES.has(campaignRows[0]?.state)) {
    return { settled: [], skipped: 'campaign is not accepting bonus settlement' };
  }

  const [referrals, xInvites] = await Promise.all([
    client.select('campaign_referrals', referralQuery(campaignId, limit)),
    client.select('campaign_x_invite_events', xInviteQuery(campaignId, limit)),
  ]);

  const pending = [
    ...referrals.map((row) => ({
      id: row.id,
      kind: 'VERIFIED_REFERRAL',
      occurredAt: row.qualified_at,
    })),
    ...xInvites.map((row) => ({
      id: row.id,
      kind: 'X_INVITE',
      occurredAt: row.verified_at,
    })),
  ].sort((left, right) => {
    const byTime = String(left.occurredAt).localeCompare(String(right.occurredAt));
    return byTime || left.kind.localeCompare(right.kind) || Number(left.id) - Number(right.id);
  }).slice(0, limit);

  const settled = [];
  for (const event of pending) {
    const result = await client.rpc('settle_campaign_bonus_award', {
      p_campaign_id: campaignId,
      p_bonus_kind: event.kind,
      p_source_id: event.id,
    });
    settled.push(normalizeRpcResult(result, event));
  }

  return { settled, skipped: null };
}
