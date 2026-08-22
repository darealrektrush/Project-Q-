import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildVerificationSourceText,
  getVerificationSourceStatus,
} from '../src/campaign/verificationSources.js';

test('empty source registry reports all 13 launch slots missing', async () => {
  const status = await getVerificationSourceStatus({ select: async () => [] });
  assert.equal(status.ready, false);
  assert.equal(status.missingVoteSlots, 9);
  assert.equal(status.missingEventSlots, 4);
  assert.match(buildVerificationSourceText(status), /Voting sites:\* 0\/9/);
  assert.match(buildVerificationSourceText(status), /XP remains disabled/);
});

test('nine voting and four event sources pass configuration when none are blocked', async () => {
  const rows = [
    ...Array.from({ length: 9 }, (_, index) => ({
      source_key: `vote_${index + 1}`, source: 'vote', classification: 'MACHINE_VERIFIED',
      health: 'healthy', checked_at: '2026-08-22T00:00:00Z',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      source_key: `bot_${index + 1}`, source: 'event', classification: 'PROOF_SUPPORTED',
      health: 'healthy', checked_at: '2026-08-22T00:00:00Z',
    })),
  ];
  const status = await getVerificationSourceStatus({ select: async () => rows });
  assert.equal(status.ready, true);
  assert.equal(status.fullEvidenceCount, 13);
  assert.equal(status.blockedCount, 0);
});

test('community-only evidence is visible but not counted as full individual-XP evidence', async () => {
  const rows = [{
    source_key: 'community_vote', source: 'vote', classification: 'COMMUNITY_PROGRESS_ONLY',
    health: null, checked_at: null,
  }];
  const status = await getVerificationSourceStatus({ select: async () => rows });
  assert.equal(status.fullEvidenceCount, 0);
  assert.equal(status.limitedEvidenceCount, 1);
  assert.match(buildVerificationSourceText(status), /community progress only/);
});

test('unavailable or integrity-removed sources keep the gate closed', async () => {
  const rows = [
    ...Array.from({ length: 9 }, (_, index) => ({
      source_key: `vote_${index + 1}`, source: 'vote', classification: index ? 'MACHINE_VERIFIED' : 'SOURCE_UNAVAILABLE',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      source_key: `bot_${index + 1}`, source: 'event', classification: index ? 'PROOF_SUPPORTED' : 'REMOVED_FOR_INTEGRITY',
    })),
  ];
  const status = await getVerificationSourceStatus({ select: async () => rows });
  assert.equal(status.configured, true);
  assert.equal(status.blockedCount, 2);
  assert.equal(status.ready, false);
});
