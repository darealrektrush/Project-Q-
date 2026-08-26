import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WEBSITE_VOTE_PROOF_BUCKET,
  WEBSITE_VOTE_PROOF_MAX_BYTES,
  inspectWebsiteVoteProofImage,
  uploadWebsiteVoteProof,
  websiteVoteProofStorageKey,
} from '../src/campaign/websiteVoteProofUpload.js';

const enabled = { PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED: 'true' };

function png(size = 4096) {
  const bytes = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return bytes;
}

test('proof inspection enforces size, declared MIME and matching file signature', () => {
  const image = inspectWebsiteVoteProofImage(png(), 'image/png');
  assert.equal(image.extension, 'png');
  assert.match(image.sha256, /^[0-9a-f]{64}$/);
  assert.throws(() => inspectWebsiteVoteProofImage(png(), 'image/jpeg'), /invalid/);
  assert.throws(() => inspectWebsiteVoteProofImage(Buffer.alloc(10), 'image/png'), /invalid/);
  assert.throws(() => inspectWebsiteVoteProofImage(png(WEBSITE_VOTE_PROOF_MAX_BYTES + 1), 'image/png'), /invalid/);
});

test('storage keys are campaign and attempt scoped with non-guessable suffixes', () => {
  const key = websiteVoteProofStorageKey('bond-the-duck-2026', 12, 'webp', 'a'.repeat(32));
  assert.equal(key, `bond-the-duck-2026/12/${'a'.repeat(32)}.webp`);
  assert.throws(() => websiteVoteProofStorageKey('../escape', 12, 'webp'), /invalid/);
});

test('upload verifies ownership before private storage and database submission', async () => {
  const calls = [];
  const client = {
    select: async (table, query) => {
      calls.push(['select', table, query]);
      return [{ id: 12, source_key: 'web:coinmooner', status: 'OPEN', started_at: '2026-09-02T12:00:00Z', expires_at: '2026-09-02T12:15:00Z' }];
    },
    uploadObject: async (...args) => { calls.push(['upload', ...args]); },
    rpc: async (fn, args) => {
      calls.push(['rpc', fn, args]);
      return [{ id: 12, source_key: 'web:coinmooner', status: 'SUBMITTED', started_at: '2026-09-02T12:00:00Z', expires_at: '2026-09-02T12:15:00Z', submitted_at: '2026-09-02T12:05:00Z' }];
    },
  };
  const attempt = await uploadWebsiteVoteProof(client, {
    telegramUserId: 123, attemptId: 12, challenge: 'c'.repeat(64),
    bytes: png(), contentType: 'image/png', submittedAt: '2026-09-02T12:05:00Z', env: enabled,
  });
  assert.deepEqual(calls.map(([kind]) => kind), ['select', 'upload', 'rpc']);
  assert.equal(calls[1][1], WEBSITE_VOTE_PROOF_BUCKET);
  assert.equal(calls[2][1], 'submit_website_vote_proof');
  assert.equal(calls[2][2].p_telegram_user_id, 123);
  assert.equal(attempt.status, 'SUBMITTED');
});

test('failed database submission attempts to remove the orphaned private object', async () => {
  const removed = [];
  const client = {
    select: async () => [{ id: 12, source_key: 'web:coinmooner', status: 'OPEN', started_at: '2026-09-02T12:00:00Z', expires_at: '2026-09-02T12:15:00Z' }],
    uploadObject: async () => {},
    rpc: async () => { throw new Error('database rejected'); },
    removeObjects: async (bucket, paths) => { removed.push([bucket, paths]); },
  };
  await assert.rejects(uploadWebsiteVoteProof(client, {
    telegramUserId: 123, attemptId: 12, challenge: 'c'.repeat(64),
    bytes: png(), contentType: 'image/png', env: enabled,
  }), /database rejected/);
  assert.equal(removed[0][0], WEBSITE_VOTE_PROOF_BUCKET);
  assert.equal(removed[0][1].length, 1);
});

test('disabled review fails before ownership checks or evidence upload', async () => {
  let called = false;
  const client = {
    select: async () => { called = true; return []; },
    uploadObject: async () => { called = true; },
  };
  await assert.rejects(uploadWebsiteVoteProof(client, {
    telegramUserId: 123, attemptId: 12, challenge: 'c'.repeat(64),
    bytes: png(), contentType: 'image/png', env: {},
  }), /review disabled/);
  assert.equal(called, false);
});
