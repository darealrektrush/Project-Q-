// Generic bridge for participation missions (website voting, Telegram
// trending bots). See supabase/campaign_participation.sql for why this is
// shared plumbing rather than one schema per site/bot, and for why the
// actual per-site verification logic is NOT here: whoever calls
// ingestParticipationEvent must already have verified the claimed action
// (checked the vote number against that site, parsed and matched the bot's
// receipt, etc.) -- this module only validates shape, then hands off to the
// atomic RPC that enforces identity, source availability and cooldown.

const SOURCES = new Set(['vote', 'event']);

function requiredString(value, field, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`invalid ${field}`);
  }
  return value.trim();
}

export function validateParticipationEvent(body) {
  const source = requiredString(body?.source, 'source', 10).toLowerCase();
  const sourceKey = requiredString(body?.source_key, 'source_key', 60);
  const telegramUserId = Number(body?.telegram_user_id);
  const evidenceRef = requiredString(body?.evidence_ref, 'evidence_ref', 300);
  const verifiedAtRaw = requiredString(body?.verified_at, 'verified_at', 40);
  const verifiedAt = new Date(verifiedAtRaw);

  if (!SOURCES.has(source)) throw new Error('invalid source');
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
    throw new Error('invalid telegram_user_id');
  }
  if (Number.isNaN(verifiedAt.getTime())) throw new Error('invalid verified_at');
  if (verifiedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error('invalid verified_at');
  }

  // Idempotency is scoped to source_key + telegram_user_id + evidence_ref so
  // the same vote/receipt replayed twice never double-inserts, without
  // needing the caller to generate or track a key itself.
  const idempotencyKey = `participation:${sourceKey}:${telegramUserId}:${evidenceRef}`;
  return {
    source, sourceKey, telegramUserId, evidenceRef,
    verifiedAt: verifiedAt.toISOString(), idempotencyKey,
  };
}

export async function ingestParticipationEvent(client, event) {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
  return client.rpc('ingest_campaign_participation_event', {
    p_campaign_id: campaignId,
    p_source: event.source,
    p_source_key: event.sourceKey,
    p_telegram_user_id: event.telegramUserId,
    p_evidence_ref: event.evidenceRef,
    p_verified_at: event.verifiedAt,
    p_idempotency_key: event.idempotencyKey,
  });
}
