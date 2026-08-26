import { createHash } from 'node:crypto';

import { telegramTrendingReceiptsEnabled } from '../lib/featureFlags.js';

export const TELEGRAM_TRENDING_BOT_PROFILES = Object.freeze([
  Object.freeze({ sourceKey: 'telegram:majorbuybot', handle: '@MajorBuyBot', cooldownSeconds: 7200 }),
  Object.freeze({ sourceKey: 'telegram:wtftrending', handle: '@WTFTrendingBot', cooldownSeconds: 3600 }),
  Object.freeze({ sourceKey: 'telegram:trenchobot', handle: '@Trenchobot', cooldownSeconds: 86400 }),
  Object.freeze({ sourceKey: 'telegram:bbtrendingbot', handle: '@BBTrendingBot', cooldownSeconds: 3600 }),
  Object.freeze({ sourceKey: 'telegram:drokiatrendsbot', handle: '@DrokiaTrendsbot', cooldownSeconds: 3600 }),
]);

const HASH = /^[0-9a-f]{64}$/;
const ACCEPTING_CLASSIFICATIONS = new Set(['MACHINE_VERIFIED', 'PROOF_SUPPORTED']);

function timestamp(value, field) {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${field}`);
  return parsed;
}

function requiredInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`invalid ${field}`);
  return parsed;
}

function normalizedText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function latestBySource(rows, field = 'configured_at') {
  const result = new Map();
  for (const row of rows) {
    const key = String(row?.source_key || '');
    if (!key) continue;
    const current = result.get(key);
    const rowTime = new Date(row?.[field]).getTime();
    const currentTime = new Date(current?.[field]).getTime();
    if (!current || rowTime > currentTime
      || (rowTime === currentTime && Number(row.id || 0) > Number(current.id || 0))) {
      result.set(key, row);
    }
  }
  return result;
}

function stringMarkers(value) {
  return Array.isArray(value)
    ? value.map(normalizedText).filter((marker) => marker.length >= 2 && marker.length <= 80)
    : [];
}

function currentCertification(source, certification, nowMs) {
  const checkedAt = new Date(certification?.checked_at).getTime();
  const expiresAt = new Date(certification?.expires_at).getTime();
  return Boolean(certification
    && certification.source_kind === 'TELEGRAM_BOT'
    && certification.classification === source.classification
    && certification.health === 'HEALTHY'
    && Number.isFinite(checkedAt) && checkedAt <= nowMs + 5 * 60 * 1000
    && Number.isFinite(expiresAt) && expiresAt > nowMs
    && expiresAt > checkedAt && expiresAt - checkedAt <= 72 * 60 * 60 * 1000);
}

export function isTelegramTrendingReceiptCandidate(message) {
  return Boolean(message?.chat?.type === 'private'
    && message?.forward_origin?.type === 'user'
    && message.forward_origin.sender_user?.is_bot);
}

export function publicTelegramTrendingSource(source) {
  return {
    sourceKey: source.sourceKey,
    handle: source.handle,
    cooldownSeconds: source.cooldownSeconds,
    accepting: source.accepting,
    status: source.status,
    verificationMode: source.verificationMode,
  };
}

export async function getTelegramTrendingReceiptSources(client, {
  campaignId = 'bond-the-duck-2026', now = new Date(),
} = {}) {
  const nowMs = timestamp(now, 'source evaluation time');
  const campaign = encodeURIComponent(String(campaignId));
  const [registryRows, certificationRows, configRows] = await Promise.all([
    client.select(
      'verification_sources',
      `?campaign_id=eq.${campaign}&source=eq.event` +
        '&select=campaign_id,source_key,source,classification,cooldown_seconds&limit=20'
    ),
    client.select(
      'verification_source_certifications',
      `?campaign_id=eq.${campaign}&source_kind=eq.TELEGRAM_BOT` +
        '&select=id,source_key,source_kind,classification,health,checked_at,expires_at' +
        '&order=checked_at.desc,id.desc&limit=100'
    ),
    client.select(
      'telegram_trending_source_configs',
      `?campaign_id=eq.${campaign}` +
        '&select=id,source_key,telegram_bot_user_id,success_markers,context_markers,' +
        'verification_mode,receipt_max_age_seconds,pair_max_gap_seconds,evidence_hash,' +
        'configured_at&order=configured_at.desc,id.desc&limit=100'
    ),
  ]);
  const registry = new Map(registryRows.map((row) => [row.source_key, row]));
  const certifications = latestBySource(certificationRows, 'checked_at');
  const configs = latestBySource(configRows);
  return TELEGRAM_TRENDING_BOT_PROFILES.map((profile) => {
    const source = registry.get(profile.sourceKey);
    const config = configs.get(profile.sourceKey);
    const numericId = Number(config?.telegram_bot_user_id);
    const successMarkers = stringMarkers(config?.success_markers);
    const contextMarkers = stringMarkers(config?.context_markers);
    const maxAgeSeconds = Number(config?.receipt_max_age_seconds);
    const verificationMode = String(config?.verification_mode || '');
    const pairMaxGapSeconds = config?.pair_max_gap_seconds === null
      ? null : Number(config?.pair_max_gap_seconds);
    const configured = Boolean(Number.isSafeInteger(numericId) && numericId > 0
      && successMarkers.length && contextMarkers.length
      && ['DIRECT_RECEIPT', 'PAIRED_CONTEXT'].includes(verificationMode)
      && Number.isInteger(maxAgeSeconds) && maxAgeSeconds >= 60 && maxAgeSeconds <= 1800
      && (verificationMode === 'DIRECT_RECEIPT'
        ? pairMaxGapSeconds === null
        : Number.isInteger(pairMaxGapSeconds) && pairMaxGapSeconds >= 30 && pairMaxGapSeconds <= 600)
      && HASH.test(String(config?.evidence_hash || '')));
    const certified = Boolean(source && currentCertification(source, certifications.get(profile.sourceKey), nowMs));
    const classificationAccepting = ACCEPTING_CLASSIFICATIONS.has(String(source?.classification || ''));
    const cooldownMatches = Number(source?.cooldown_seconds) === profile.cooldownSeconds;
    let status = 'PENDING_CONFIGURATION';
    if (!source || !classificationAccepting || !cooldownMatches) status = 'REGISTRY_BLOCKED';
    else if (!configured) status = 'PENDING_CONFIGURATION';
    else if (!certified) status = 'PENDING_CERTIFICATION';
    else status = 'AVAILABLE';
    return {
      ...profile,
      telegramBotUserId: configured ? numericId : null,
      successMarkers: configured ? successMarkers : [],
      contextMarkers: configured ? contextMarkers : [],
      receiptMaxAgeSeconds: configured ? maxAgeSeconds : null,
      verificationMode: configured ? verificationMode : null,
      pairMaxGapSeconds: configured ? pairMaxGapSeconds : null,
      accepting: status === 'AVAILABLE',
      status,
    };
  });
}

export function validateTelegramTrendingReceiptMessage(message, sources, {
  now = new Date(), env = process.env,
} = {}) {
  if (!telegramTrendingReceiptsEnabled(env)) throw new Error('Telegram trending receipts disabled');
  if (message?.chat?.type !== 'private') throw new Error('Telegram trending receipt must be forwarded privately');
  const telegramUserId = requiredInteger(message?.from?.id, 'telegram_user_id');
  if (message?.from?.is_bot) throw new Error('invalid Telegram trending receipt participant');
  const origin = message?.forward_origin;
  if (origin?.type !== 'user' || !origin.sender_user?.is_bot) {
    throw new Error('Telegram trending receipt origin is not a known bot');
  }
  const originBotUserId = requiredInteger(origin.sender_user.id, 'origin_bot_user_id');
  const matching = sources.filter((source) => source.accepting
    && source.telegramBotUserId === originBotUserId);
  if (matching.length !== 1) throw new Error('Telegram trending receipt source is not certified');
  const source = matching[0];
  const receiptText = String(message.text || message.caption || '').normalize('NFKC').trim();
  if (!receiptText || receiptText.length > 1500) throw new Error('invalid Telegram trending receipt text');
  const normalizedReceipt = normalizedText(receiptText);
  const successMatched = source.successMarkers.some((marker) => normalizedReceipt.includes(marker));
  const contextMatched = source.contextMarkers.some((marker) => normalizedReceipt.includes(marker));
  let receiptKind = 'RECEIPT';
  if (source.verificationMode === 'DIRECT_RECEIPT') {
    if (!successMatched) throw new Error('Telegram trending receipt success marker is missing');
    if (!contextMatched) throw new Error('Telegram trending receipt FAWKQ context is missing');
  } else if (source.verificationMode === 'PAIRED_CONTEXT') {
    if (!successMatched && contextMatched) receiptKind = 'CONTEXT';
    else if (!successMatched) throw new Error('Telegram trending receipt marker is missing');
  } else {
    throw new Error('Telegram trending receipt source mode is invalid');
  }
  const nowMs = timestamp(now, 'receipt validation time');
  const forwardedAtMs = requiredInteger(message.date, 'forwarded_message_date') * 1000;
  const originalAtMs = requiredInteger(origin.date, 'original_message_date') * 1000;
  if (forwardedAtMs > nowMs + 5 * 60 * 1000 || originalAtMs > forwardedAtMs + 5 * 60 * 1000
    || forwardedAtMs < originalAtMs
    || forwardedAtMs - originalAtMs > source.receiptMaxAgeSeconds * 1000) {
    throw new Error('Telegram trending receipt is outside the certified forwarding window');
  }
  const normalizedTextHash = createHash('sha256').update(normalizedReceipt).digest('hex');
  const receiptHash = createHash('sha256')
    .update(`${originBotUserId}:${Math.floor(originalAtMs / 1000)}:${normalizedTextHash}`)
    .digest('hex');
  return {
    kind: receiptKind,
    sourceKey: source.sourceKey,
    sourceHandle: source.handle,
    telegramUserId,
    originBotUserId,
    originalMessageAt: new Date(originalAtMs).toISOString(),
    forwardedAt: new Date(forwardedAtMs).toISOString(),
    receiptHash,
    normalizedTextHash,
    receiptText,
    evidenceRef: `telegram-receipt:${receiptHash}`,
  };
}

export async function ingestTelegramTrendingReceipt(client, receipt, {
  campaignId = 'bond-the-duck-2026', env = process.env,
} = {}) {
  if (!telegramTrendingReceiptsEnabled(env)) throw new Error('Telegram trending receipts disabled');
  return client.rpc('ingest_telegram_trending_receipt', {
    p_campaign_id: String(campaignId),
    p_source_key: receipt.sourceKey,
    p_telegram_user_id: receipt.telegramUserId,
    p_origin_bot_user_id: receipt.originBotUserId,
    p_original_message_at: receipt.originalMessageAt,
    p_forwarded_at: receipt.forwardedAt,
    p_receipt_hash: receipt.receiptHash,
    p_normalized_text_hash: receipt.normalizedTextHash,
    p_receipt_text: receipt.receiptText,
  });
}

export async function recordTelegramTrendingReceiptContext(client, receipt, {
  campaignId = 'bond-the-duck-2026', env = process.env,
} = {}) {
  if (!telegramTrendingReceiptsEnabled(env)) throw new Error('Telegram trending receipts disabled');
  return client.rpc('record_telegram_trending_receipt_context', {
    p_campaign_id: String(campaignId),
    p_source_key: receipt.sourceKey,
    p_telegram_user_id: receipt.telegramUserId,
    p_origin_bot_user_id: receipt.originBotUserId,
    p_original_message_at: receipt.originalMessageAt,
    p_forwarded_at: receipt.forwardedAt,
    p_context_hash: receipt.receiptHash,
    p_normalized_text_hash: receipt.normalizedTextHash,
    p_context_text: receipt.receiptText,
  });
}

export async function handleTelegramTrendingReceipt(client, message, {
  campaignId = 'bond-the-duck-2026', now = new Date(), env = process.env,
} = {}) {
  const sources = await getTelegramTrendingReceiptSources(client, { campaignId, now });
  const receipt = validateTelegramTrendingReceiptMessage(message, sources, { now, env });
  if (receipt.kind === 'CONTEXT') {
    const contextResult = await recordTelegramTrendingReceiptContext(
      client, receipt, { campaignId, env }
    );
    const contextRow = Array.isArray(contextResult) ? contextResult[0] : contextResult;
    return {
      sourceKey: receipt.sourceKey,
      sourceHandle: receipt.sourceHandle,
      eventId: null,
      receiptId: null,
      contextId: Number(contextRow?.id || 0) || null,
      contextStored: Boolean(contextRow?.id),
      accepted: false,
    };
  }
  const result = await ingestTelegramTrendingReceipt(client, receipt, { campaignId, env });
  const row = Array.isArray(result) ? result[0] : result;
  return {
    sourceKey: receipt.sourceKey,
    sourceHandle: receipt.sourceHandle,
    eventId: Number(row?.participation_event_id || 0) || null,
    receiptId: Number(row?.id || 0) || null,
    contextId: Number(row?.context_id || 0) || null,
    contextStored: false,
    accepted: Boolean(row?.id),
  };
}
