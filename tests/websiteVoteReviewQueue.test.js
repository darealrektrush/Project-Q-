import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertWebsiteVoteReviewer,
  decideWebsiteVoteReview,
  getWebsiteVoteReviewEvidence,
  getWebsiteVoteReviewQueue,
  websiteVoteRejectionReason,
} from '../src/campaign/websiteVoteReviewQueue.js';
import {
  buildWebsiteVoteReviewCaption,
  buildWebsiteVoteReviewDecisionKeyboard,
  buildWebsiteVoteReviewQueueKeyboard,
  buildWebsiteVoteReviewQueueText,
} from '../src/lib/admin.js';

const enabled = { PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED: 'true' };

function png(size = 4096) {
  const bytes = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return bytes;
}

function attempt(overrides = {}) {
  return {
    id: 12,
    campaign_id: 'bond-the-duck-2026',
    source_key: 'web:coinmooner',
    telegram_user_id: 99887766,
    status: 'SUBMITTED',
    proof_storage_key: `bond-the-duck-2026/12/${'a'.repeat(32)}.png`,
    proof_sha256: 'placeholder',
    receipt_text: null,
    observed_vote_count: null,
    submitted_at: '2026-09-02T12:05:00.000Z',
    ...overrides,
  };
}

function certification() {
  return {
    id: 1, source_key: 'web:coinmooner', health: 'HEALTHY',
    checked_at: '2026-09-02T11:00:00.000Z', expires_at: '2026-09-04T11:00:00.000Z',
  };
}

test('reviewer access is flag-gated and campaign-founder bound', async () => {
  let selects = 0;
  const client = { select: async () => { selects += 1; return [{ founder_user_id: 88 }]; } };
  await assert.rejects(assertWebsiteVoteReviewer(client, {
    reviewerUserId: 88, env: {},
  }), /review disabled/);
  assert.equal(selects, 0);
  assert.equal(await assertWebsiteVoteReviewer(client, {
    reviewerUserId: 88, env: enabled,
  }), 88);
});

test('queue exposes a pseudonymous oldest-first review model without evidence paths', async () => {
  const bytes = png();
  const sha = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
  const client = {
    select: async (table) => {
      if (table === 'campaign_founders') return [{ founder_user_id: 88 }];
      if (table === 'website_vote_attempts') return [attempt({ proof_sha256: sha })];
      if (table === 'verification_source_certifications') return [certification()];
      return [];
    },
  };
  const queue = await getWebsiteVoteReviewQueue(client, {
    reviewerUserId: 88, now: '2026-09-02T12:10:00.000Z', env: enabled,
  });
  assert.equal(queue.items[0].participantTag.startsWith('Duck '), true);
  assert.deepEqual(queue.items[0].riskFlags, []);
  const text = buildWebsiteVoteReviewQueueText(queue);
  assert.match(text, /CoinMooner/);
  assert.match(text, /5m waiting/);
  assert.doesNotMatch(text, /99887766|bond-the-duck-2026\/12|proof_sha256/);
  assert.equal(buildWebsiteVoteReviewQueueKeyboard(queue).inline_keyboard[0][0].callback_data, 'admin:votereview:12');
});

test('private evidence is downloaded server-side and re-hashed before preview', async () => {
  const bytes = png();
  const sha = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
  const client = {
    select: async (table) => {
      if (table === 'campaign_founders') return [{ founder_user_id: 88 }];
      if (table === 'website_vote_attempts') return [attempt({ proof_sha256: sha })];
      if (table === 'verification_source_certifications') return [certification()];
      return [];
    },
    downloadObject: async () => ({ bytes, contentType: 'image/png' }),
  };
  const result = await getWebsiteVoteReviewEvidence(client, {
    reviewerUserId: 88, attemptId: 12, env: enabled,
  });
  assert.equal(result.evidence.extension, 'png');
  assert.equal(result.item.proofSha256, sha);
  const caption = buildWebsiteVoteReviewCaption(result.item);
  assert.match(caption, /CoinMooner/);
  assert.doesNotMatch(caption, /99887766|bond-the-duck-2026\/12/);
  const callbacks = buildWebsiteVoteReviewDecisionKeyboard(result.item)
    .inline_keyboard.flat().map(({ callback_data: value }) => value);
  assert.ok(callbacks.includes('admin:votedecide:12:a'));
  assert.ok(callbacks.includes('admin:votedecide:12:r-duplicate'));

  client.downloadObject = async () => ({ bytes: Buffer.concat([bytes, Buffer.from([1])]), contentType: 'image/png' });
  await assert.rejects(getWebsiteVoteReviewEvidence(client, {
    reviewerUserId: 88, attemptId: 12, env: enabled,
  }), /integrity check failed/);
});

test('decisions use fixed auditable reasons and the existing atomic review RPC', async () => {
  const calls = [];
  const client = {
    select: async () => [{ founder_user_id: 88 }],
    rpc: async (fn, args) => { calls.push([fn, args]); return [{ id: 12, status: 'REJECTED' }]; },
  };
  await decideWebsiteVoteReview(client, {
    reviewerUserId: 88, attemptId: 12, decision: 'REJECT', rejectionCode: 'timing',
    reviewedAt: '2026-09-02T12:15:00.000Z', env: enabled,
  });
  assert.equal(calls[0][0], 'review_website_vote_proof');
  assert.match(calls[0][1].p_reason, /timing|cooldown/i);
  assert.match(websiteVoteRejectionReason('privacy'), /sensitive information/);
  await assert.rejects(decideWebsiteVoteReview(client, {
    reviewerUserId: 88, attemptId: 12, decision: 'REJECT', rejectionCode: 'invented', env: enabled,
  }), /invalid website vote rejection reason/);
});
