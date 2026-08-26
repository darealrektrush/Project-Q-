import { createHash, randomBytes } from 'node:crypto';

import { websiteVoteReviewEnabled } from '../lib/featureFlags.js';
import {
  publicWebsiteVoteAttempt,
  requireWebsiteVoteAttemptOwner,
  submitWebsiteVoteProof,
} from './websiteVoteVerification.js';

export const WEBSITE_VOTE_PROOF_BUCKET = 'bond-vote-proofs';
export const WEBSITE_VOTE_PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const WEBSITE_VOTE_PROOF_MIN_BYTES = 4 * 1024;

const MIME = Object.freeze({
  'image/jpeg': { extension: 'jpg', matches: (bytes) =>
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', matches: (bytes) =>
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', matches: (bytes) =>
    bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP' },
});

export function inspectWebsiteVoteProofImage(value, contentType) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value || []);
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
  const profile = MIME[mime];
  if (!profile || bytes.length < WEBSITE_VOTE_PROOF_MIN_BYTES
    || bytes.length > WEBSITE_VOTE_PROOF_MAX_BYTES || !profile.matches(bytes)) {
    throw new Error('invalid website vote proof image');
  }
  return {
    bytes,
    contentType: mime,
    extension: profile.extension,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function websiteVoteProofStorageKey(campaignId, attemptId, extension, token) {
  const campaign = String(campaignId || '').trim();
  const id = Number(attemptId);
  const suffix = token || randomBytes(16).toString('hex');
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(campaign)
    || !Number.isSafeInteger(id) || id <= 0
    || !['jpg', 'png', 'webp'].includes(extension)
    || !/^[0-9a-f]{32}$/.test(suffix)) {
    throw new Error('invalid website vote proof storage identity');
  }
  return `${campaign}/${id}/${suffix}.${extension}`;
}

export async function uploadWebsiteVoteProof(client, {
  campaignId = 'bond-the-duck-2026', telegramUserId, attemptId, challenge,
  bytes, contentType, submittedAt = new Date(), env = process.env,
} = {}) {
  if (!websiteVoteReviewEnabled(env)) throw new Error('website vote review disabled');
  const image = inspectWebsiteVoteProofImage(bytes, contentType);
  await requireWebsiteVoteAttemptOwner(client, { campaignId, telegramUserId, attemptId });
  const storageKey = websiteVoteProofStorageKey(campaignId, attemptId, image.extension);
  await client.uploadObject(WEBSITE_VOTE_PROOF_BUCKET, storageKey, image.bytes, image.contentType);
  try {
    const rows = await submitWebsiteVoteProof(client, {
      attemptId, telegramUserId, challenge, proofStorageKey: storageKey,
      proofSha256: image.sha256, submittedAt, env,
    });
    return publicWebsiteVoteAttempt(Array.isArray(rows) ? rows[0] : rows);
  } catch (error) {
    try {
      await client.removeObjects?.(WEBSITE_VOTE_PROOF_BUCKET, [storageKey]);
    } catch (cleanupError) {
      console.error('website vote proof orphan cleanup failed', cleanupError.message);
    }
    throw error;
  }
}
