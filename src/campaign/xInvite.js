import { createHash } from 'node:crypto';

import { DEFAULT_CAMPAIGN_ID } from './service.js';

const ID = /^[0-9]{1,24}$/;

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

export function validateXInviteEvent(body, env = process.env) {
  const mainPostId = String(env.FAWKQ_BOND_CAMPAIGN_POST_ID ?? '');
  if (!ID.test(mainPostId)) throw new Error('invalid configured campaign post id');
  const fields = ['telegramUserId', 'xUserId', 'replyPostId', 'conversationId', 'referencedPostId'];
  for (const field of fields) if (!ID.test(String(body?.[field] ?? ''))) throw new Error(`invalid ${field}`);
  if (String(body.conversationId) !== mainPostId || String(body.referencedPostId) !== mainPostId) {
    throw new Error('invalid campaign reply target');
  }
  if (body.referencedType !== 'replied_to') throw new Error('invalid campaign reference type');
  const mentions = Array.isArray(body.mentions) ? body.mentions : [];
  const unique = new Map();
  for (const mention of mentions) {
    const userId = String(mention?.userId ?? '');
    const username = String(mention?.username ?? '').replace(/^@/, '').toLowerCase();
    if (ID.test(userId) && /^[a-z0-9_]{1,15}$/.test(username)) unique.set(userId, { userId, username });
  }
  const excluded = new Set([String(body.xUserId), String(env.FAWKQ_OFFICIAL_X_USER_ID ?? '')]);
  const verifiedMentions = [...unique.values()].filter(({ userId }) => !excluded.has(userId));
  if (verifiedMentions.length !== 3) throw new Error('invalid friend mentions');
  const verifiedAt = new Date(body.verifiedAt);
  if (!Number.isFinite(verifiedAt.getTime())) throw new Error('invalid verifiedAt');
  if (verifiedAt.getTime() > Date.now() + 5 * 60 * 1000) throw new Error('invalid verifiedAt');
  const idempotencyKey = createHash('sha256').update([
    campaignId(env), body.telegramUserId, body.xUserId, body.replyPostId, ...verifiedMentions.map(({ userId }) => userId).sort(),
  ].join(':')).digest('hex');
  return {
    campaignId: campaignId(env),
    telegramUserId: String(body.telegramUserId), xUserId: String(body.xUserId),
    mainPostId, replyPostId: String(body.replyPostId), conversationId: String(body.conversationId),
    referencedPostId: String(body.referencedPostId), referencedType: body.referencedType,
    mentions: verifiedMentions,
    verifiedAt: verifiedAt.toISOString(), idempotencyKey,
  };
}

export async function ingestXInviteEvent(client, event) {
  return client.rpc('ingest_campaign_x_invite', {
    p_campaign_id: event.campaignId,
    p_telegram_user_id: event.telegramUserId,
    p_x_user_id: event.xUserId,
    p_main_post_id: event.mainPostId,
    p_reply_post_id: event.replyPostId,
    p_conversation_id: event.conversationId,
    p_referenced_post_id: event.referencedPostId,
    p_referenced_type: event.referencedType,
    p_mentions: event.mentions,
    p_verified_at: event.verifiedAt,
    p_idempotency_key: event.idempotencyKey,
  });
}

export async function getXInviteStatus(client, telegramUserId, { id = campaignId() } = {}) {
  const rows = await client.select('campaign_x_invite_events',
    `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    '&select=reply_post_id,verified_at,bonus_xp_ledger_id&limit=1');
  const row = rows[0];
  return row ? {
    verified: true,
    replyPostId: row.reply_post_id,
    verifiedAt: row.verified_at,
    bonusAwarded: row.bonus_xp_ledger_id != null,
  } : { verified: false, replyPostId: null, verifiedAt: null, bonusAwarded: false };
}

export function closedXInviteStatus() {
  return { verified: false, replyPostId: null, verifiedAt: null, bonusAwarded: false, unavailable: true };
}
