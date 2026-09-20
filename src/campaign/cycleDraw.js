import { createHash, randomBytes } from 'node:crypto';

export const BOND_DRAW_PROTOCOL_VERSION = 'bond-draw-v1';
export const BOND_DRAW_COMMIT_DOMAIN = 'bond-draw-commit-v1';
export const BOND_DRAW_SEED_DOMAIN = 'bond-draw-seed-v1';
export const BOND_DRAW_REVEAL_WINDOW_MS = 30 * 60 * 1000;

const HEX_32 = /^[0-9a-f]{64}$/;
const BLOCKHASH = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function generateCycleDrawReveal() {
  return randomBytes(32).toString('hex');
}

export function cycleDrawCommitHash({ campaignId, cycleId, revealValue }) {
  if (!campaignId || !Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5 || !HEX_32.test(String(revealValue || ''))) {
    throw new Error('invalid cycle draw commitment input');
  }
  return createHash('sha256')
    .update(`${BOND_DRAW_COMMIT_DOMAIN}|${campaignId}|${cycleId}|${revealValue}`)
    .digest('hex');
}

export function cycleDrawPublicSeed({ campaignId, cycleId, commitHash, cutoffSlot, cutoffBlockhash }) {
  const slot = Number(cutoffSlot);
  if (!campaignId || !Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5
    || !HEX_32.test(String(commitHash || ''))
    || !Number.isSafeInteger(slot) || slot <= 0
    || !BLOCKHASH.test(String(cutoffBlockhash || ''))) {
    throw new Error('invalid cycle draw seed evidence');
  }
  return createHash('sha256')
    .update(`${BOND_DRAW_SEED_DOMAIN}|${campaignId}|${cycleId}|${commitHash}|${slot}|${cutoffBlockhash}`)
    .digest('hex');
}

export function verifyCycleCutoffBracket({
  closesAt,
  previousSlot,
  previousBlockTime,
  cutoffSlot,
  cutoffBlockTime,
} = {}) {
  const closeMs = Date.parse(closesAt);
  const previousMs = Date.parse(previousBlockTime);
  const cutoffMs = Date.parse(cutoffBlockTime);
  if (!Number.isFinite(closeMs) || !Number.isFinite(previousMs) || !Number.isFinite(cutoffMs)
    || !Number.isSafeInteger(Number(previousSlot)) || Number(previousSlot) <= 0
    || !Number.isSafeInteger(Number(cutoffSlot)) || Number(cutoffSlot) <= Number(previousSlot)) {
    return false;
  }
  return previousMs < closeMs && cutoffMs >= closeMs && previousMs <= cutoffMs;
}

export function revealDeadline(cutoffBlockTime) {
  const cutoff = Date.parse(cutoffBlockTime);
  if (!Number.isFinite(cutoff)) throw new Error('invalid cutoff block time');
  return new Date(cutoff + BOND_DRAW_REVEAL_WINDOW_MS).toISOString();
}

export function revealIsOnTime(revealedAt, cutoffBlockTime) {
  const reveal = Date.parse(revealedAt);
  const deadline = Date.parse(revealDeadline(cutoffBlockTime));
  return Number.isFinite(reveal) && reveal <= deadline;
}
