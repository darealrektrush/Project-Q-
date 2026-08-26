import { createHash } from 'node:crypto';

import { websiteVoteReviewEnabled } from '../lib/featureFlags.js';
import { WEBSITE_VOTE_PROFILES, reviewWebsiteVoteProof } from './websiteVoteVerification.js';
import {
  WEBSITE_VOTE_PROOF_BUCKET,
  inspectWebsiteVoteProofImage,
} from './websiteVoteProofUpload.js';

const HASH = /^[0-9a-f]{64}$/;
const STORAGE_KEY = /^[a-z0-9][a-z0-9-]{2,63}\/\d+\/[0-9a-f]{32}\.(?:jpg|png|webp)$/;
const REJECTION_REASONS = Object.freeze({
  format: 'Screenshot does not show a clear post-vote or cooldown state.',
  source: 'Evidence does not match the registered FAWKQ source page.',
  timing: 'Vote timing or cooldown state cannot be verified from this evidence.',
  duplicate: 'Evidence appears duplicated, recycled or otherwise inconsistent.',
  privacy: 'Evidence contains unrelated sensitive information and must be resubmitted safely.',
});

function requiredInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`invalid ${field}`);
  return parsed;
}

function publicParticipantTag(campaignId, telegramUserId) {
  return `Duck ${createHash('sha256')
    .update(`${campaignId}:${telegramUserId}`)
    .digest('hex').slice(0, 8).toUpperCase()}`;
}

function latestBySource(rows) {
  const result = new Map();
  for (const row of rows) {
    const current = result.get(row.source_key);
    if (!current || new Date(row.checked_at).getTime() > new Date(current.checked_at).getTime()) {
      result.set(row.source_key, row);
    }
  }
  return result;
}

function healthyCertification(certification, nowMs) {
  const checkedAt = new Date(certification?.checked_at).getTime();
  const expiresAt = new Date(certification?.expires_at).getTime();
  return Boolean(certification?.health === 'HEALTHY'
    && Number.isFinite(checkedAt) && checkedAt <= nowMs + 5 * 60 * 1000
    && Number.isFinite(expiresAt) && expiresAt > nowMs);
}

function reviewItem(row, certification, nowMs) {
  const profile = WEBSITE_VOTE_PROFILES.find(({ sourceKey }) => sourceKey === row.source_key);
  const submittedAt = new Date(row.submitted_at).getTime();
  const ageMinutes = Number.isFinite(submittedAt)
    ? Math.max(0, Math.floor((nowMs - submittedAt) / 60000)) : null;
  const riskFlags = [];
  if (!profile?.individualXpEligible) riskFlags.push('SOURCE_NOT_INDIVIDUAL_XP_ELIGIBLE');
  if (!healthyCertification(certification, nowMs)) riskFlags.push('CERTIFICATION_NOT_CURRENT');
  if (!HASH.test(String(row.proof_sha256 || ''))) riskFlags.push('PROOF_HASH_INVALID');
  if (!STORAGE_KEY.test(String(row.proof_storage_key || ''))) riskFlags.push('STORAGE_KEY_INVALID');
  if (ageMinutes === null) riskFlags.push('SUBMISSION_TIME_INVALID');
  return {
    id: Number(row.id),
    sourceKey: String(row.source_key),
    sourceName: profile?.name || String(row.source_key),
    sourceUrl: profile?.url || null,
    participantTag: publicParticipantTag(row.campaign_id, row.telegram_user_id),
    status: String(row.status),
    submittedAt: row.submitted_at,
    ageMinutes,
    receiptText: row.receipt_text ? String(row.receipt_text).slice(0, 500) : null,
    observedVoteCount: row.observed_vote_count === null ? null : Number(row.observed_vote_count),
    proofStorageKey: String(row.proof_storage_key || ''),
    proofSha256: String(row.proof_sha256 || ''),
    riskFlags,
  };
}

export function websiteVoteRejectionReason(code) {
  const reason = REJECTION_REASONS[String(code || '').toLowerCase()];
  if (!reason) throw new Error('invalid website vote rejection reason');
  return reason;
}

export async function assertWebsiteVoteReviewer(client, {
  campaignId = 'bond-the-duck-2026', reviewerUserId, env = process.env,
} = {}) {
  if (!websiteVoteReviewEnabled(env)) throw new Error('website vote review disabled');
  const reviewer = requiredInteger(reviewerUserId, 'reviewer_user_id');
  const rows = await client.select(
    'campaign_founders',
    `?campaign_id=eq.${encodeURIComponent(String(campaignId))}` +
      `&founder_user_id=eq.${reviewer}&enabled=eq.true&select=founder_user_id&limit=1`
  );
  if (!rows[0]) throw new Error('reviewer is not authorized for this campaign');
  return reviewer;
}

export async function getWebsiteVoteReviewQueue(client, {
  campaignId = 'bond-the-duck-2026', reviewerUserId, now = new Date(), env = process.env,
} = {}) {
  await assertWebsiteVoteReviewer(client, { campaignId, reviewerUserId, env });
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new Error('invalid website vote review queue time');
  const campaign = encodeURIComponent(String(campaignId));
  const [attempts, certifications] = await Promise.all([
    client.select(
      'website_vote_attempts',
      `?campaign_id=eq.${campaign}&status=eq.SUBMITTED` +
        '&select=id,campaign_id,source_key,telegram_user_id,status,proof_storage_key,proof_sha256,' +
        'receipt_text,observed_vote_count,submitted_at&order=submitted_at.asc,id.asc&limit=100'
    ),
    client.select(
      'verification_source_certifications',
      `?campaign_id=eq.${campaign}&source_kind=eq.WEBSITE_VOTE` +
        '&select=id,source_key,health,checked_at,expires_at&order=checked_at.desc,id.desc&limit=100'
    ),
  ]);
  const latestCertifications = latestBySource(certifications);
  return {
    campaignId: String(campaignId),
    generatedAt: new Date(nowMs).toISOString(),
    items: attempts.map((row) => reviewItem(row, latestCertifications.get(row.source_key), nowMs)),
  };
}

export async function getWebsiteVoteReviewEvidence(client, {
  campaignId = 'bond-the-duck-2026', reviewerUserId, attemptId, env = process.env,
} = {}) {
  await assertWebsiteVoteReviewer(client, { campaignId, reviewerUserId, env });
  const id = requiredInteger(attemptId, 'attempt_id');
  const campaign = encodeURIComponent(String(campaignId));
  const [rows, certifications] = await Promise.all([
    client.select(
      'website_vote_attempts',
      `?id=eq.${id}&campaign_id=eq.${campaign}&status=eq.SUBMITTED` +
        '&select=id,campaign_id,source_key,telegram_user_id,status,proof_storage_key,proof_sha256,' +
        'receipt_text,observed_vote_count,submitted_at&limit=1'
    ),
    client.select(
      'verification_source_certifications',
      `?campaign_id=eq.${campaign}&source_kind=eq.WEBSITE_VOTE` +
        '&select=id,source_key,health,checked_at,expires_at&order=checked_at.desc,id.desc&limit=100'
    ),
  ]);
  if (!rows[0]) throw new Error('website vote attempt is not ready for review');
  const item = reviewItem(rows[0], latestBySource(certifications).get(rows[0].source_key), Date.now());
  if (!STORAGE_KEY.test(item.proofStorageKey)
    || !item.proofStorageKey.startsWith(`${campaignId}/${id}/`)) {
    throw new Error('invalid website vote proof storage key');
  }
  const evidence = await client.downloadObject(WEBSITE_VOTE_PROOF_BUCKET, item.proofStorageKey);
  const inspected = inspectWebsiteVoteProofImage(evidence?.bytes, evidence?.contentType);
  if (inspected.sha256 !== item.proofSha256) throw new Error('website vote proof integrity check failed');
  return {
    item,
    evidence: { bytes: inspected.bytes, contentType: inspected.contentType, extension: inspected.extension },
  };
}

export async function decideWebsiteVoteReview(client, {
  campaignId = 'bond-the-duck-2026', reviewerUserId, attemptId,
  decision, rejectionCode = null, reviewedAt = new Date(), env = process.env,
} = {}) {
  await assertWebsiteVoteReviewer(client, { campaignId, reviewerUserId, env });
  const normalized = String(decision || '').toUpperCase();
  const reason = normalized === 'APPROVE'
    ? 'Visible FAWKQ post-vote or cooldown state matched the certified source profile.'
    : websiteVoteRejectionReason(rejectionCode);
  return reviewWebsiteVoteProof(client, {
    attemptId,
    reviewerUserId,
    decision: normalized,
    reason,
    reviewedAt,
    env,
  });
}

export function websiteVoteReviewReasonCodes() {
  return Object.keys(REJECTION_REASONS);
}
