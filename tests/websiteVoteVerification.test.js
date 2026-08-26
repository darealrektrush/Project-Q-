import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  WEBSITE_VOTE_ATTEMPT_TTL_MS,
  WEBSITE_VOTE_PROFILES,
  buildWebsiteVoteChallenge,
  getWebsiteVoteParticipantState,
  requireWebsiteVoteAttemptOwner,
  reviewWebsiteVoteProof,
  startWebsiteVoteAttempt,
  submitWebsiteVoteProof,
} from '../src/campaign/websiteVoteVerification.js';

const enabled = { PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED: 'true' };
const client = (calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return [{ id: 1 }]; },
});

test('website profiles lock all nine audited sources and only three support individual proof', () => {
  assert.equal(WEBSITE_VOTE_PROFILES.length, 9);
  assert.equal(new Set(WEBSITE_VOTE_PROFILES.map(({ sourceKey }) => sourceKey)).size, 9);
  assert.deepEqual(
    WEBSITE_VOTE_PROFILES.filter(({ individualXpEligible }) => individualXpEligible)
      .map(({ sourceKey }) => sourceKey),
    ['web:coinmooner', 'web:gemfinder', 'web:coinmun']
  );
  assert.equal(
    WEBSITE_VOTE_PROFILES.find(({ sourceKey }) => sourceKey === 'web:geckoterminal').classification,
    'COMMUNITY_PROGRESS_ONLY'
  );
});

test('server verification profiles cannot drift from the signed campaign rules', async () => {
  const rules = JSON.parse(await readFile(
    new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8'
  ));
  assert.deepEqual(
    rules.verificationSources.websiteVoting.map((source) => ({
      sourceKey: source.sourceKey,
      name: source.name,
      url: source.url,
      verificationMode: source.verificationMode,
      classification: source.classification,
      certificationStatus: source.certificationStatus,
      cooldownSeconds: source.cooldownSeconds,
      individualXpEligible: source.individualXpEligible,
    })),
    WEBSITE_VOTE_PROFILES
  );
});

test('challenge material is random and only its hash is persisted', () => {
  const first = buildWebsiteVoteChallenge();
  const second = buildWebsiteVoteChallenge();
  assert.match(first.challenge, /^[0-9a-f]{64}$/);
  assert.match(first.challengeHash, /^[0-9a-f]{64}$/);
  assert.notEqual(first.challenge, second.challenge);
  assert.notEqual(first.challengeHash, second.challengeHash);
});

test('attempt creation is gated, profile-limited and expires after fifteen minutes', async () => {
  const calls = [];
  const input = {
    sourceKey: 'web:coinmooner', telegramUserId: 123,
    challengeHash: 'a'.repeat(64), startedAt: '2026-09-02T12:00:00.000Z',
  };
  await assert.rejects(startWebsiteVoteAttempt(client(calls), input), /disabled/);
  await assert.rejects(startWebsiteVoteAttempt(client(calls), {
    ...input, sourceKey: 'web:geckoterminal', env: enabled,
  }), /not accepting individual proof/);
  await startWebsiteVoteAttempt(client(calls), { ...input, env: enabled });
  assert.equal(calls[0].fn, 'start_website_vote_attempt');
  assert.equal(
    new Date(calls[0].args.p_expires_at) - new Date(calls[0].args.p_started_at),
    WEBSITE_VOTE_ATTEMPT_TTL_MS
  );
});

test('proof submission binds storage object and hashes to one attempt', async () => {
  const calls = [];
  await submitWebsiteVoteProof(client(calls), {
    attemptId: 4, telegramUserId: 123, challenge: 'd'.repeat(64),
    proofStorageKey: 'website-votes/4/proof.webp',
    proofSha256: 'b'.repeat(64), proofPerceptualHash: 'c'.repeat(32),
    receiptText: 'You can vote once a day', observedVoteCount: 20, env: enabled,
  });
  assert.equal(calls[0].fn, 'submit_website_vote_proof');
  assert.equal(calls[0].args.p_telegram_user_id, 123);
  assert.equal(calls[0].args.p_challenge, 'd'.repeat(64));
  assert.equal(calls[0].args.p_proof_sha256, 'b'.repeat(64));
  await assert.rejects(submitWebsiteVoteProof(client(), {
    attemptId: 4, telegramUserId: 123, challenge: 'd'.repeat(64),
    proofStorageKey: '../escape', proofSha256: 'b'.repeat(64), env: enabled,
  }), /invalid website vote proof/);
});

test('participant state exposes source readiness without hashes, storage keys or reviewer ids', async () => {
  const now = new Date('2026-09-02T12:00:00.000Z');
  const clientWithState = {
    select: async (table) => {
      if (table === 'verification_sources') return [
        { source_key: 'web:coinmooner', source: 'vote', classification: 'PROOF_SUPPORTED', cooldown_seconds: 86400 },
        { source_key: 'web:gemfinder', source: 'vote', classification: 'PROOF_SUPPORTED', cooldown_seconds: 86400 },
        { source_key: 'web:coinmun', source: 'vote', classification: 'PROOF_SUPPORTED', cooldown_seconds: 86400 },
      ];
      if (table === 'verification_source_certifications') return [
        { id: 1, source_key: 'web:coinmooner', classification: 'PROOF_SUPPORTED', health: 'HEALTHY', checked_at: '2026-09-02T11:00:00Z', expires_at: '2026-09-04T11:00:00Z' },
        { id: 2, source_key: 'web:gemfinder', classification: 'PROOF_SUPPORTED', health: 'HEALTHY', checked_at: '2026-09-02T11:00:00Z', expires_at: '2026-09-04T11:00:00Z' },
        { id: 3, source_key: 'web:coinmun', classification: 'PROOF_SUPPORTED', health: 'HEALTHY', checked_at: '2026-09-02T11:00:00Z', expires_at: '2026-09-04T11:00:00Z' },
      ];
      if (table === 'website_vote_attempts') return [{
        id: 10, source_key: 'web:gemfinder', status: 'SUBMITTED',
        started_at: '2026-09-02T11:30:00Z', expires_at: '2026-09-02T11:45:00Z',
        submitted_at: '2026-09-02T11:40:00Z', proof_sha256: 'secret', reviewer_user_id: 99,
      }];
      if (table === 'campaign_participation_events') return [{
        id: 9, source_key: 'web:coinmun', verified_at: '2026-09-02T10:00:00Z', credited: true,
      }];
      return [];
    },
  };
  const state = await getWebsiteVoteParticipantState(clientWithState, 123, { now, env: enabled });
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'web:coinmooner').status, 'AVAILABLE');
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'web:gemfinder').status, 'PENDING_REVIEW');
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'web:coinmun').status, 'ON_COOLDOWN');
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'web:geckoterminal').status, 'COMMUNITY_ONLY');
  assert.doesNotMatch(JSON.stringify(state), /proof_sha256|reviewer_user_id|storage/i);
});

test('attempt ownership is checked before any proof upload', async () => {
  const selectCalls = [];
  const ownerClient = { select: async (table, query) => {
    selectCalls.push([table, query]);
    return [{ id: 5, source_key: 'web:coinmooner', status: 'OPEN', started_at: '2026-09-02T12:00:00Z', expires_at: '2026-09-02T12:15:00Z' }];
  } };
  const attempt = await requireWebsiteVoteAttemptOwner(ownerClient, {
    attemptId: 5, telegramUserId: 123,
  });
  assert.equal(attempt.id, 5);
  assert.match(selectCalls[0][1], /telegram_user_id=eq\.123/);
  await assert.rejects(requireWebsiteVoteAttemptOwner({ select: async () => [] }, {
    attemptId: 5, telegramUserId: 999,
  }), /not found/);
});

test('review uses an explicit approve or reject decision and an audit reason', async () => {
  const calls = [];
  await reviewWebsiteVoteProof(client(calls), {
    attemptId: 4, reviewerUserId: 88, decision: 'approve',
    reason: 'Source-specific cooldown state and FAWKQ marker verified.', env: enabled,
  });
  assert.equal(calls[0].fn, 'review_website_vote_proof');
  assert.equal(calls[0].args.p_decision, 'APPROVE');
  await assert.rejects(reviewWebsiteVoteProof(client(), {
    attemptId: 4, reviewerUserId: 88, decision: 'maybe', reason: 'unclear', env: enabled,
  }), /invalid website vote review/);
});
