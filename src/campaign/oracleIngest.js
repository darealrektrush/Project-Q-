import { createHash, timingSafeEqual } from 'node:crypto';

const ACTIONS = new Set(['like', 'retweet', 'reply', 'bookmark', 'quotepost']);

function requiredString(value, field, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`invalid ${field}`);
  }
  return value.trim();
}

export function secretMatches(provided, expected) {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validateOracleRaidEvent(body) {
  const raidId = requiredString(body?.raid_id, 'raid_id');
  const xUserId = requiredString(body?.x_user_id, 'x_user_id');
  const action = requiredString(body?.action, 'action', 20).toLowerCase();
  const tweetId = requiredString(body?.tweet_id, 'tweet_id');
  const telegramUserId = Number(body?.telegram_user_id);
  const verifiedAtRaw = requiredString(body?.verified_at, 'verified_at', 40);\n  const verifiedAt = new Date(verifiedAtRaw);
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
    throw new Error('invalid telegram_user_id');
  }
  if (!ACTIONS.has(action)) throw new Error('invalid action');
  if (Number.isNaN(verifiedAt.getTime())) throw new Error('invalid verified_at');\n  if (verifiedAt.getTime() > Date.now() + 5 * 60 * 1000) {\n    throw new Error('invalid verified_at');\n  }
  const idempotencyKey = createHash('sha256')
    .update(`oracle:${raidId}:${xUserId}:${action}`)
    .digest('hex');
  return {
    raidId, telegramUserId, xUserId, action, tweetId,
    verifiedAt: verifiedAt.toISOString(), idempotencyKey,
  };
}

export async function ingestOracleRaidEvent(client, event) {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
  return client.rpc('ingest_oracle_raid_event', {
    p_campaign_id: campaignId,
    p_raid_id: event.raidId,
    p_telegram_user_id: event.telegramUserId,
    p_x_user_id: event.xUserId,
    p_action: event.action,
    p_tweet_id: event.tweetId,
    p_verified_at: event.verifiedAt,
    p_idempotency_key: event.idempotencyKey,
  });
}
