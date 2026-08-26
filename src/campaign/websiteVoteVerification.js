import { createHash, randomBytes } from 'node:crypto';

import { websiteVoteReviewEnabled } from '../lib/featureFlags.js';

export const WEBSITE_VOTE_ATTEMPT_TTL_MS = 15 * 60 * 1000;
export const WEBSITE_VOTE_COOLDOWN_SECONDS = 24 * 60 * 60;

export const WEBSITE_VOTE_PROFILES = Object.freeze([
  Object.freeze({
    sourceKey: 'web:geckoterminal', name: 'GeckoTerminal',
    url: 'https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM',
    verificationMode: 'AGGREGATE_ONLY', classification: 'COMMUNITY_PROGRESS_ONLY',
    certificationStatus: 'OBSERVED_NO_USER_RECEIPT', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
  Object.freeze({
    sourceKey: 'web:top100token', name: 'Top100Token',
    url: 'https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    verificationMode: 'PENDING_LIVE_TEST', classification: 'SOURCE_UNAVAILABLE',
    certificationStatus: 'CLOUDFLARE_BLOCKED', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
  Object.freeze({
    sourceKey: 'web:coinmooner', name: 'CoinMooner',
    url: 'https://coinmooner.com/coins/fawk-q-fawkq',
    verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED',
    certificationStatus: 'OBSERVED_24H', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: true,
  }),
  Object.freeze({
    sourceKey: 'web:gemfinder', name: 'GemFinder',
    url: 'https://gemfinder.cc/gem/29742',
    verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED',
    certificationStatus: 'OBSERVED_24H', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: true,
  }),
  Object.freeze({
    sourceKey: 'web:coinsniper', name: 'CoinSniper',
    url: 'https://coinsniper.net/coin/92949',
    verificationMode: 'PENDING_LIVE_TEST', classification: 'SOURCE_UNAVAILABLE',
    certificationStatus: 'CLOUDFLARE_BLOCKED', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
  Object.freeze({
    sourceKey: 'web:coinmun', name: 'CoinMun',
    url: 'https://coinmun.com/coins/fawk-q',
    verificationMode: 'SCREENSHOT_REVIEW', classification: 'PROOF_SUPPORTED',
    certificationStatus: 'OBSERVED_24H', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: true,
  }),
  Object.freeze({
    sourceKey: 'web:coinboom', name: 'CoinBoom',
    url: 'https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE',
    certificationStatus: 'NO_FREE_VOTE_OBSERVED', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
  Object.freeze({
    sourceKey: 'web:coinbuzzer', name: 'CoinBuzzer',
    url: 'https://coinbuzzer.me/coin/860',
    verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE',
    certificationStatus: 'OFFLINE', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
  Object.freeze({
    sourceKey: 'web:coinscope', name: 'CoinScope',
    url: 'https://www.coinscope.co/coin/fawkq',
    verificationMode: 'SOURCE_UNAVAILABLE', classification: 'SOURCE_UNAVAILABLE',
    certificationStatus: 'OFFLINE', cooldownSeconds: WEBSITE_VOTE_COOLDOWN_SECONDS,
    individualXpEligible: false,
  }),
]);

const PROFILE_BY_KEY = new Map(WEBSITE_VOTE_PROFILES.map((profile) => [profile.sourceKey, profile]));
const HASH = /^[0-9a-f]{64}$/;
const STORAGE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{0,299}$/;
const REVIEW_DECISIONS = new Set(['APPROVE', 'REJECT']);

function requiredInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`invalid ${field}`);
  return parsed;
}

function profile(sourceKey) {
  const value = PROFILE_BY_KEY.get(String(sourceKey || '').trim());
  if (!value) throw new Error('unknown website vote source');
  return value;
}

function enabledProfile(sourceKey) {
  const value = profile(sourceKey);
  if (!value.individualXpEligible || value.verificationMode !== 'SCREENSHOT_REVIEW') {
    throw new Error('website vote source is not accepting individual proof');
  }
  return value;
}

function requireEnabled(env) {
  if (!websiteVoteReviewEnabled(env)) throw new Error('website vote review disabled');
}

function parsedTime(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function latestBySource(rows, dateField = 'id') {
  const result = new Map();
  for (const row of rows) {
    const key = String(row?.source_key || '');
    if (!key) continue;
    const current = result.get(key);
    const value = dateField === 'id' ? Number(row?.id || 0) : (parsedTime(row?.[dateField]) ?? -Infinity);
    const currentValue = dateField === 'id'
      ? Number(current?.id || 0)
      : (parsedTime(current?.[dateField]) ?? -Infinity);
    if (!current || value > currentValue) result.set(key, row);
  }
  return result;
}

function currentHealthyCertification(source, certification, nowMs) {
  const checkedAt = parsedTime(certification?.checked_at);
  const expiresAt = parsedTime(certification?.expires_at);
  return Boolean(certification
    && certification.classification === source.classification
    && certification.health === 'HEALTHY'
    && checkedAt !== null && checkedAt <= nowMs + 5 * 60 * 1000
    && expiresAt !== null && expiresAt > nowMs
    && expiresAt > checkedAt && expiresAt - checkedAt <= 72 * 60 * 60 * 1000);
}

export function publicWebsiteVoteAttempt(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    sourceKey: String(row.source_key),
    status: String(row.status),
    startedAt: row.started_at || null,
    expiresAt: row.expires_at || null,
    submittedAt: row.submitted_at || null,
    reviewedAt: row.reviewed_at || null,
    rejectionReason: row.status === 'REJECTED' ? String(row.review_reason || '') || null : null,
  };
}

export function closedWebsiteVoteParticipantState(env = process.env) {
  return {
    available: false,
    enabled: websiteVoteReviewEnabled(env),
    generatedAt: null,
    sources: WEBSITE_VOTE_PROFILES.map((source) => ({
      sourceKey: source.sourceKey,
      name: source.name,
      url: source.url,
      status: source.verificationMode === 'AGGREGATE_ONLY' ? 'COMMUNITY_ONLY' : 'UNAVAILABLE',
      cooldownSeconds: source.cooldownSeconds,
      nextAvailableAt: null,
      attempt: null,
    })),
  };
}

export async function getWebsiteVoteParticipantState(
  client,
  telegramUserId,
  { campaignId = 'bond-the-duck-2026', now = new Date(), env = process.env } = {}
) {
  const userId = requiredInteger(telegramUserId, 'telegram_user_id');
  const nowMs = parsedTime(now);
  if (nowMs === null) throw new Error('invalid website vote state time');
  const encodedCampaign = encodeURIComponent(String(campaignId));
  const encodedUser = encodeURIComponent(String(userId));
  const [registryRows, certificationRows, attemptRows, eventRows] = await Promise.all([
    client.select(
      'verification_sources',
      `?campaign_id=eq.${encodedCampaign}&source=eq.vote` +
        '&select=source_key,classification,cooldown_seconds,health,target_url&limit=50'
    ),
    client.select(
      'verification_source_certifications',
      `?campaign_id=eq.${encodedCampaign}&source_kind=eq.WEBSITE_VOTE` +
        '&select=id,source_key,classification,health,checked_at,expires_at&order=checked_at.desc,id.desc&limit=100'
    ),
    client.select(
      'website_vote_attempts',
      `?campaign_id=eq.${encodedCampaign}&telegram_user_id=eq.${encodedUser}` +
        '&select=id,source_key,status,started_at,expires_at,submitted_at,reviewed_at,review_reason' +
        '&order=id.desc&limit=100'
    ),
    client.select(
      'campaign_participation_events',
      `?campaign_id=eq.${encodedCampaign}&telegram_user_id=eq.${encodedUser}&source=eq.vote` +
        '&select=id,source_key,verified_at,credited,reason&order=verified_at.desc,id.desc&limit=500'
    ),
  ]);
  const registry = new Map(registryRows.map((row) => [row.source_key, row]));
  const certifications = latestBySource(certificationRows, 'checked_at');
  const attempts = latestBySource(attemptRows);
  const events = latestBySource(eventRows, 'verified_at');
  const enabled = websiteVoteReviewEnabled(env);

  const sources = WEBSITE_VOTE_PROFILES.map((configured) => {
    const source = registry.get(configured.sourceKey);
    const attemptRow = attempts.get(configured.sourceKey) || null;
    const event = events.get(configured.sourceKey) || null;
    const attempt = publicWebsiteVoteAttempt(attemptRow);
    const classificationAccepting = ['MACHINE_VERIFIED', 'PROOF_SUPPORTED']
      .includes(String(source?.classification || ''));
    const certified = Boolean(source
      && currentHealthyCertification(source, certifications.get(configured.sourceKey), nowMs));
    const cooldownSeconds = Number(source?.cooldown_seconds ?? configured.cooldownSeconds);
    const lastVerifiedAtMs = parsedTime(event?.verified_at);
    const nextAvailableAtMs = lastVerifiedAtMs === null
      ? null
      : lastVerifiedAtMs + Math.max(0, cooldownSeconds) * 1000;

    let status;
    if (configured.verificationMode === 'AGGREGATE_ONLY') status = 'COMMUNITY_ONLY';
    else if (!configured.individualXpEligible || !classificationAccepting) {
      status = configured.verificationMode === 'PENDING_LIVE_TEST'
        ? 'PENDING_CERTIFICATION' : 'UNAVAILABLE';
    } else if (attempt?.status === 'SUBMITTED') status = 'PENDING_REVIEW';
    else if (!enabled || !certified) status = 'PENDING_CERTIFICATION';
    else if (attempt?.status === 'OPEN' && parsedTime(attempt.expiresAt) > nowMs) status = 'IN_PROGRESS';
    else if (nextAvailableAtMs !== null && nextAvailableAtMs > nowMs) status = 'ON_COOLDOWN';
    else status = 'AVAILABLE';

    return {
      sourceKey: configured.sourceKey,
      name: configured.name,
      url: configured.url,
      status,
      cooldownSeconds,
      nextAvailableAt: nextAvailableAtMs === null ? null : new Date(nextAvailableAtMs).toISOString(),
      verifiedVotes: eventRows.filter((row) => row.source_key === configured.sourceKey && row.credited).length,
      attempt,
    };
  });

  return {
    available: true,
    enabled,
    generatedAt: new Date(nowMs).toISOString(),
    sources,
  };
}

export async function requireWebsiteVoteAttemptOwner(client, {
  attemptId, telegramUserId, campaignId = 'bond-the-duck-2026',
} = {}) {
  const id = requiredInteger(attemptId, 'attempt_id');
  const userId = requiredInteger(telegramUserId, 'telegram_user_id');
  const rows = await client.select(
    'website_vote_attempts',
    `?id=eq.${id}&campaign_id=eq.${encodeURIComponent(String(campaignId))}` +
      `&telegram_user_id=eq.${userId}` +
      '&select=id,source_key,status,started_at,expires_at&limit=1'
  );
  if (!rows[0]) throw new Error('website vote attempt not found');
  if (rows[0].status !== 'OPEN') throw new Error('website vote attempt is not open');
  return publicWebsiteVoteAttempt(rows[0]);
}

export function buildWebsiteVoteChallenge() {
  const challenge = randomBytes(32).toString('hex');
  return {
    challenge,
    challengeHash: createHash('sha256').update(challenge).digest('hex'),
  };
}

export async function startWebsiteVoteAttempt(client, {
  campaignId = 'bond-the-duck-2026', sourceKey, telegramUserId,
  challengeHash, baselineVoteCount = null, startedAt = new Date(), env = process.env,
} = {}) {
  requireEnabled(env);
  const source = enabledProfile(sourceKey);
  const userId = requiredInteger(telegramUserId, 'telegram_user_id');
  if (!HASH.test(String(challengeHash || ''))) throw new Error('invalid challenge_hash');
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) throw new Error('invalid started_at');
  const baseline = baselineVoteCount === null ? null : Number(baselineVoteCount);
  if (baseline !== null && (!Number.isSafeInteger(baseline) || baseline < 0)) {
    throw new Error('invalid baseline_vote_count');
  }
  return client.rpc('start_website_vote_attempt', {
    p_campaign_id: String(campaignId), p_source_key: source.sourceKey,
    p_telegram_user_id: userId, p_challenge_hash: String(challengeHash),
    p_started_at: start.toISOString(),
    p_expires_at: new Date(start.getTime() + WEBSITE_VOTE_ATTEMPT_TTL_MS).toISOString(),
    p_baseline_vote_count: baseline,
  });
}

export async function submitWebsiteVoteProof(client, {
  attemptId, telegramUserId, challenge, proofStorageKey, proofSha256, proofPerceptualHash = null,
  receiptText = null, observedVoteCount = null, submittedAt = new Date(), env = process.env,
} = {}) {
  requireEnabled(env);
  const id = requiredInteger(attemptId, 'attempt_id');
  const userId = requiredInteger(telegramUserId, 'telegram_user_id');
  if (!/^[0-9a-f]{64}$/.test(String(challenge || ''))) throw new Error('invalid website vote challenge');
  if (!STORAGE_KEY.test(String(proofStorageKey || '')) || !HASH.test(String(proofSha256 || ''))) {
    throw new Error('invalid website vote proof');
  }
  if (proofPerceptualHash !== null && !/^[0-9a-f]{16,128}$/.test(String(proofPerceptualHash))) {
    throw new Error('invalid proof_perceptual_hash');
  }
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) throw new Error('invalid submitted_at');
  const observed = observedVoteCount === null ? null : Number(observedVoteCount);
  if (observed !== null && (!Number.isSafeInteger(observed) || observed < 0)) {
    throw new Error('invalid observed_vote_count');
  }
  const text = receiptText === null ? null : String(receiptText).trim();
  if (text && text.length > 500) throw new Error('invalid receipt_text');
  return client.rpc('submit_website_vote_proof', {
    p_attempt_id: id, p_telegram_user_id: userId,
    p_challenge: String(challenge),
    p_proof_storage_key: String(proofStorageKey),
    p_proof_sha256: String(proofSha256), p_proof_perceptual_hash: proofPerceptualHash,
    p_receipt_text: text || null, p_observed_vote_count: observed,
    p_submitted_at: submitted.toISOString(),
  });
}

export async function reviewWebsiteVoteProof(client, {
  attemptId, reviewerUserId, decision, reason, reviewedAt = new Date(), env = process.env,
} = {}) {
  requireEnabled(env);
  const id = requiredInteger(attemptId, 'attempt_id');
  const reviewer = requiredInteger(reviewerUserId, 'reviewer_user_id');
  const normalizedDecision = String(decision || '').trim().toUpperCase();
  const normalizedReason = String(reason || '').trim();
  if (!REVIEW_DECISIONS.has(normalizedDecision) || !normalizedReason || normalizedReason.length > 500) {
    throw new Error('invalid website vote review');
  }
  const reviewed = new Date(reviewedAt);
  if (Number.isNaN(reviewed.getTime())) throw new Error('invalid reviewed_at');
  return client.rpc('review_website_vote_proof', {
    p_attempt_id: id, p_reviewer_user_id: reviewer,
    p_decision: normalizedDecision, p_reason: normalizedReason,
    p_reviewed_at: reviewed.toISOString(),
  });
}
