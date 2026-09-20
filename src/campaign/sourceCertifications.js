import { createHash } from 'node:crypto';

import { sourceCertificationEnabled } from '../lib/featureFlags.js';

export const EXPECTED_SOURCE_COUNTS = Object.freeze({
  WEBSITE_VOTE: 9,
  TELEGRAM_BOT: 5,
});
export const EXPECTED_TOTAL_SOURCE_COUNT = Object.values(EXPECTED_SOURCE_COUNTS)
  .reduce((total, count) => total + count, 0);
export const MIN_ACCEPTING_SOURCE_COUNTS = Object.freeze({
  WEBSITE_VOTE: 3,
  TELEGRAM_BOT: 5,
});
export const BOND_TELEGRAM_BOTS = Object.freeze([
  '@majorbuybot',
  '@wtftrending',
  '@trenchobot',
  '@BBtrendingbot',
  '@drokiatrendsbot',
]);
export const SOURCE_CERTIFICATION_MAX_AGE_MS = 72 * 60 * 60 * 1000;

const ALL_CLASSIFICATIONS = new Set([
  'MACHINE_VERIFIED', 'PROOF_SUPPORTED', 'COMMUNITY_PROGRESS_ONLY',
  'SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY',
]);
// Only these classifications can support participant-attributed XP. An
// aggregate community counter can still be useful campaign telemetry, but it
// is not proof that a particular Project Q identity performed the action.
const ACCEPTING_CLASSIFICATIONS = new Set(['MACHINE_VERIFIED', 'PROOF_SUPPORTED']);
const SOURCE_KINDS = new Set(Object.keys(EXPECTED_SOURCE_COUNTS));
const HEALTH_STATES = new Set(['HEALTHY', 'DEGRADED', 'OFFLINE', 'REMOVED']);
const HASH = /^[0-9a-f]{64}$/;

export function certificationHealthMatchesClassification(classification, health) {
  if (['MACHINE_VERIFIED', 'PROOF_SUPPORTED'].includes(classification)) return health === 'HEALTHY';
  if (classification === 'COMMUNITY_PROGRESS_ONLY') return ['HEALTHY', 'DEGRADED'].includes(health);
  if (classification === 'SOURCE_UNAVAILABLE') return ['DEGRADED', 'OFFLINE'].includes(health);
  if (classification === 'REMOVED_FOR_INTEGRITY') return health === 'REMOVED';
  return false;
}

function kindForRegistrySource(source) {
  if (source === 'vote') return 'WEBSITE_VOTE';
  if (source === 'event') return 'TELEGRAM_BOT';
  return null;
}

function timestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function validEvidenceUrl(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch {
    return false;
  }
}

function newerCertification(left, right) {
  const leftCheckedAt = timestamp(left?.checked_at) ?? -Infinity;
  const rightCheckedAt = timestamp(right?.checked_at) ?? -Infinity;
  if (leftCheckedAt !== rightCheckedAt) return leftCheckedAt > rightCheckedAt;
  return Number(left?.id || 0) > Number(right?.id || 0);
}

export function evaluateSourceCertifications(
  sourceRows = [],
  certificationRows = [],
  { now = new Date() } = {}
) {
  const nowMs = timestamp(now);
  if (nowMs === null) throw new Error('invalid source certification evaluation time');

  const registry = new Map();
  const duplicateSourceKeys = new Set();
  for (const row of sourceRows) {
    const sourceKey = String(row?.source_key || '').trim();
    if (!sourceKey) continue;
    if (registry.has(sourceKey)) duplicateSourceKeys.add(sourceKey);
    else registry.set(sourceKey, row);
  }

  const latest = new Map();
  for (const row of certificationRows) {
    const sourceKey = String(row?.source_key || '').trim();
    if (!sourceKey) continue;
    const current = latest.get(sourceKey);
    if (!current || newerCertification(row, current)) latest.set(sourceKey, row);
  }

  const counts = { WEBSITE_VOTE: 0, TELEGRAM_BOT: 0 };
  const sourceStatuses = [];
  for (const [sourceKey, source] of registry) {
    const sourceKind = kindForRegistrySource(source.source);
    if (sourceKind) counts[sourceKind] += 1;
    const certification = latest.get(sourceKey) ?? null;
    const checkedAt = timestamp(certification?.checked_at);
    const expiresAt = timestamp(certification?.expires_at);
    const durationMs = checkedAt === null || expiresAt === null ? null : expiresAt - checkedAt;
    const classification = String(source.classification || '');
    const registryAccepting = ACCEPTING_CLASSIFICATIONS.has(classification);
    const evidenceCurrent = Boolean(certification
      && certification.campaign_id === source.campaign_id
      && certification.source_kind === sourceKind
      && certification.classification === source.classification
      && checkedAt !== null
      && checkedAt <= nowMs + 5 * 60 * 1000
      && expiresAt !== null
      && expiresAt > nowMs
      && durationMs > 0
      && durationMs <= SOURCE_CERTIFICATION_MAX_AGE_MS
      && HASH.test(String(certification.evidence_hash || ''))
      && validEvidenceUrl(certification.evidence_url));
    const health = String(certification?.health || 'UNCERTIFIED');
    const healthMatchesClassification = certificationHealthMatchesClassification(classification, health);
    const current = evidenceCurrent && healthMatchesClassification;
    sourceStatuses.push({
      sourceKey,
      sourceKind,
      classification,
      registryAccepting,
      health,
      checkedAt: certification?.checked_at || null,
      expiresAt: certification?.expires_at || null,
      current,
    });
  }

  const exactComposition = registry.size === EXPECTED_TOTAL_SOURCE_COUNT
    && duplicateSourceKeys.size === 0
    && counts.WEBSITE_VOTE === EXPECTED_SOURCE_COUNTS.WEBSITE_VOTE
    && counts.TELEGRAM_BOT === EXPECTED_SOURCE_COUNTS.TELEGRAM_BOT;
  const currentCount = sourceStatuses.filter(({ current }) => current).length;
  const acceptingCounts = sourceStatuses.reduce((totals, source) => {
    if (source.registryAccepting && source.current) totals[source.sourceKind] += 1;
    return totals;
  }, { WEBSITE_VOTE: 0, TELEGRAM_BOT: 0 });
  const acceptingMinimumsReady =
    acceptingCounts.WEBSITE_VOTE >= MIN_ACCEPTING_SOURCE_COUNTS.WEBSITE_VOTE
    && acceptingCounts.TELEGRAM_BOT >= MIN_ACCEPTING_SOURCE_COUNTS.TELEGRAM_BOT;
  const blockers = [];
  if (!exactComposition) blockers.push('exact 9 website / 5 Telegram bot composition is not registered');
  if (currentCount !== EXPECTED_TOTAL_SOURCE_COUNT) {
    blockers.push(`${EXPECTED_TOTAL_SOURCE_COUNT - currentCount} source certification(s) are missing, stale or inconsistent with their registry classification`);
  }
  if (acceptingCounts.WEBSITE_VOTE < MIN_ACCEPTING_SOURCE_COUNTS.WEBSITE_VOTE) {
    blockers.push(`at least ${MIN_ACCEPTING_SOURCE_COUNTS.WEBSITE_VOTE} participant-verifiable website sources must be current and healthy`);
  }
  if (acceptingCounts.TELEGRAM_BOT < MIN_ACCEPTING_SOURCE_COUNTS.TELEGRAM_BOT) {
    blockers.push('all five Telegram bot sources must be current and healthy');
  }

  return {
    ready: exactComposition && currentCount === EXPECTED_TOTAL_SOURCE_COUNT && acceptingMinimumsReady,
    exactComposition,
    registeredCount: registry.size,
    websiteCount: counts.WEBSITE_VOTE,
    telegramBotCount: counts.TELEGRAM_BOT,
    currentCertificationCount: currentCount,
    acceptingWebsiteCount: acceptingCounts.WEBSITE_VOTE,
    acceptingTelegramBotCount: acceptingCounts.TELEGRAM_BOT,
    blockers,
    sources: sourceStatuses.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey)),
    latestCertifications: [...latest.values()].sort((left, right) =>
      String(left.source_key || '').localeCompare(String(right.source_key || ''))
    ),
  };
}

export async function getVerificationSourceCertificationState(
  client,
  campaignId = 'bond-the-duck-2026',
  { now = new Date() } = {}
) {
  const id = String(campaignId || '').trim();
  if (!id) throw new Error('campaign id is required');
  const [sourceRows, certificationRows] = await Promise.all([
    client.select(
      'verification_sources',
      `?campaign_id=eq.${encodeURIComponent(id)}&select=campaign_id,source_key,source,classification,target_url&limit=100`
    ),
    client.select(
      'verification_source_certifications',
      `?campaign_id=eq.${encodeURIComponent(id)}` +
        '&select=id,campaign_id,source_key,source_kind,classification,health,evidence_url,evidence_hash,checked_at,expires_at' +
        '&order=checked_at.desc,id.desc&limit=500'
    ),
  ]);
  return evaluateSourceCertifications(sourceRows, certificationRows, { now });
}

export function sourceCertificationIdempotencyKey({
  campaignId, sourceKey, founderUserId, checkedAt, evidenceHash,
}) {
  const values = [campaignId, sourceKey, founderUserId, checkedAt, evidenceHash]
    .map((value) => String(value || '').trim());
  if (values.some((value) => !value) || !/^\d+$/.test(values[2]) || !HASH.test(values[4])) {
    throw new Error('invalid source certification identity');
  }
  return createHash('sha256').update(values.join(':')).digest('hex');
}

export async function recordVerificationSourceCertification(client, {
  campaignId,
  sourceKey,
  sourceKind,
  classification,
  health,
  evidenceUrl,
  evidenceHash,
  checkedAt,
  expiresAt,
  founderUserId,
  idempotencyKey,
  env = process.env,
} = {}) {
  if (!sourceCertificationEnabled(env)) throw new Error('verification source certification disabled');
  const checkedAtMs = timestamp(checkedAt);
  const expiresAtMs = timestamp(expiresAt);
  if (!String(campaignId || '').trim() || !String(sourceKey || '').trim()
    || !SOURCE_KINDS.has(sourceKind) || !ALL_CLASSIFICATIONS.has(classification)
    || !HEALTH_STATES.has(health) || !certificationHealthMatchesClassification(classification, health)
    || !validEvidenceUrl(evidenceUrl)
    || !HASH.test(String(evidenceHash || '')) || !/^\d+$/.test(String(founderUserId || ''))
    || !HASH.test(String(idempotencyKey || '')) || checkedAtMs === null || expiresAtMs === null
    || expiresAtMs <= checkedAtMs || expiresAtMs - checkedAtMs > SOURCE_CERTIFICATION_MAX_AGE_MS) {
    throw new Error('invalid verification source certification');
  }
  return client.rpc('record_verification_source_certification', {
    p_campaign_id: String(campaignId),
    p_source_key: String(sourceKey),
    p_source_kind: sourceKind,
    p_classification: classification,
    p_health: health,
    p_evidence_url: String(evidenceUrl),
    p_evidence_hash: String(evidenceHash),
    p_checked_at: new Date(checkedAtMs).toISOString(),
    p_expires_at: new Date(expiresAtMs).toISOString(),
    p_founder_user_id: String(founderUserId),
    p_idempotency_key: String(idempotencyKey),
  });
}

export function buildSourceCertificationAdminText(state) {
  const blocked = state.sources.filter(({ current }) => !current);
  return [
    '🛡 *BOND THE DUCK // SOURCE CERTIFICATIONS*',
    '',
    `*Readiness:* ${state.ready ? 'PASS' : 'BLOCKED'}`,
    `*Registered:* ${state.registeredCount}/${EXPECTED_TOTAL_SOURCE_COUNT}`,
    `*Website voting:* ${state.websiteCount}/9`,
    `*Telegram bots:* ${state.telegramBotCount}/${EXPECTED_SOURCE_COUNTS.TELEGRAM_BOT}`,
    `*Operational certifications:* ${state.currentCertificationCount}/${EXPECTED_TOTAL_SOURCE_COUNT}`,
    `*Participant website sources:* ${state.acceptingWebsiteCount}/${MIN_ACCEPTING_SOURCE_COUNTS.WEBSITE_VOTE} minimum`,
    `*Participant Telegram bots:* ${state.acceptingTelegramBotCount}/${MIN_ACCEPTING_SOURCE_COUNTS.TELEGRAM_BOT}`,
    '',
    ...(state.blockers.length ? state.blockers.map((blocker) => `⛔ ${blocker}`) : ['✅ Exact composition and truthful operational certifications verified.']),
    ...(blocked.length ? ['', '*Needs attention:*', ...blocked.slice(0, 13).map(({ sourceKey, health, classification }) =>
      `• ${sourceKey}: ${classification} / ${health}`
    )] : []),
    '',
    'Certifications expire within 72 hours and are bound into the exact launch-readiness hash.',
  ].join('\n');
}
