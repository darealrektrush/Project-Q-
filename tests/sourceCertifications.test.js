import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSourceCertificationAdminText,
  evaluateSourceCertifications,
  recordVerificationSourceCertification,
  sourceCertificationIdempotencyKey,
} from '../src/campaign/sourceCertifications.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';
const NOW = new Date('2026-08-25T12:00:00.000Z');

function fixture() {
  const sources = Array.from({ length: 14 }, (_, index) => ({
    campaign_id: CAMPAIGN_ID,
    source_key: index < 9 ? `vote-${index + 1}` : `bot-${index - 8}`,
    source: index < 9 ? 'vote' : 'event',
    classification: 'MACHINE_VERIFIED',
  }));
  const certifications = sources.map((source, index) => ({
    id: index + 1,
    campaign_id: CAMPAIGN_ID,
    source_key: source.source_key,
    source_kind: source.source === 'vote' ? 'WEBSITE_VOTE' : 'TELEGRAM_BOT',
    classification: source.classification,
    health: 'HEALTHY',
    evidence_url: `https://evidence.example/${source.source_key}`,
    evidence_hash: String(index).padStart(64, 'a').slice(-64),
    checked_at: '2026-08-25T11:00:00.000Z',
    expires_at: '2026-08-27T11:00:00.000Z',
  }));
  return { sources, certifications };
}

test('exact nine-site/five-bot composition with current healthy evidence passes', () => {
  const { sources, certifications } = fixture();
  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, true);
  assert.deepEqual({
    registered: state.registeredCount,
    websites: state.websiteCount,
    bots: state.telegramBotCount,
    current: state.currentCertificationCount,
  }, { registered: 14, websites: 9, bots: 5, current: 14 });
});

test('fourteen rows with the wrong composition remain blocked', () => {
  const { sources, certifications } = fixture();
  sources[8].source = 'event';
  certifications[8].source_kind = 'TELEGRAM_BOT';
  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.exactComposition, false);
  assert.deepEqual([state.websiteCount, state.telegramBotCount], [8, 6]);
});

test('missing, expired, unhealthy and registry-mismatched evidence all fail closed', () => {
  for (const mutate of [
    ({ certifications }) => certifications.pop(),
    ({ certifications }) => { certifications[0].expires_at = '2026-08-25T11:59:59.000Z'; },
    ({ certifications }) => { certifications[0].health = 'DEGRADED'; },
    ({ sources }) => { sources[0].classification = 'SOURCE_UNAVAILABLE'; },
    ({ certifications }) => { certifications[0].source_kind = 'TELEGRAM_BOT'; },
  ]) {
    const value = fixture();
    mutate(value);
    assert.equal(evaluateSourceCertifications(value.sources, value.certifications, { now: NOW }).ready, false);
  }
});

test('source readiness blocks if fewer than three healthy participant-verifiable websites remain', () => {
  const { sources, certifications } = fixture();
  for (let index = 2; index < 9; index += 1) {
    sources[index].classification = 'SOURCE_UNAVAILABLE';
    certifications[index].classification = 'SOURCE_UNAVAILABLE';
    certifications[index].health = 'OFFLINE';
  }
  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.acceptingWebsiteCount, 2);
  assert.match(state.blockers.join(' '), /at least 3 participant-verifiable website sources/);
});

test('source readiness blocks if any Telegram bot loses healthy participant attribution', () => {
  const { sources, certifications } = fixture();
  certifications[9].health = 'DEGRADED';
  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.acceptingTelegramBotCount, 4);
  assert.match(state.blockers.join(' '), /all five Telegram bot sources/);
});

test('non-attributable sources can be truthfully certified without pretending they award individual XP', () => {
  const { sources, certifications } = fixture();

  // Keep exactly three participant-verifiable websites, one community-only
  // website, five intentionally unavailable websites, and all five bots.
  for (let index = 0; index < 9; index += 1) {
    if (index < 3) {
      sources[index].classification = 'PROOF_SUPPORTED';
      certifications[index].classification = 'PROOF_SUPPORTED';
      certifications[index].health = 'HEALTHY';
    } else if (index === 3) {
      sources[index].classification = 'COMMUNITY_PROGRESS_ONLY';
      certifications[index].classification = 'COMMUNITY_PROGRESS_ONLY';
      certifications[index].health = 'HEALTHY';
    } else {
      sources[index].classification = 'SOURCE_UNAVAILABLE';
      certifications[index].classification = 'SOURCE_UNAVAILABLE';
      certifications[index].health = 'OFFLINE';
    }
  }

  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, true);
  assert.equal(state.currentCertificationCount, 14);
  assert.equal(state.acceptingWebsiteCount, 3);
  assert.equal(state.acceptingTelegramBotCount, 5);
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'vote-4').registryAccepting, false);
  assert.equal(state.sources.find(({ sourceKey }) => sourceKey === 'vote-5').health, 'OFFLINE');
});

test('latest certification wins and admin output never reveals evidence URLs or hashes', () => {
  const { sources, certifications } = fixture();
  certifications.push({
    ...certifications[0], id: 99, health: 'OFFLINE',
    checked_at: '2026-08-25T11:30:00.000Z',
  });
  const state = evaluateSourceCertifications(sources, certifications, { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.currentCertificationCount, 13);
  const text = buildSourceCertificationAdminText(state);
  assert.match(text, /vote-1: MACHINE_VERIFIED \/ OFFLINE/);
  assert.doesNotMatch(text, /evidence\.example|a{64}/);
});

test('source certification mutations are flag-gated and call the exact server RPC', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push({ fn, args }); return [{ id: 1 }]; } };
  const input = {
    campaignId: CAMPAIGN_ID,
    sourceKey: 'vote-1',
    sourceKind: 'WEBSITE_VOTE',
    classification: 'MACHINE_VERIFIED',
    health: 'HEALTHY',
    evidenceUrl: 'https://evidence.example/vote-1',
    evidenceHash: 'b'.repeat(64),
    checkedAt: '2026-08-25T11:00:00.000Z',
    expiresAt: '2026-08-27T11:00:00.000Z',
    founderUserId: 101,
    idempotencyKey: 'c'.repeat(64),
  };
  await assert.rejects(recordVerificationSourceCertification(client, input), /disabled/);
  await recordVerificationSourceCertification(client, {
    ...input, env: { PROJECT_Q_SOURCE_CERTIFICATION_ENABLED: 'true' },
  });
  assert.equal(calls[0].fn, 'record_verification_source_certification');
  assert.equal(calls[0].args.p_source_kind, 'WEBSITE_VOTE');
  assert.equal(calls[0].args.p_founder_user_id, '101');
});

test('source certification idempotency binds source, founder, time and evidence', () => {
  const input = {
    campaignId: CAMPAIGN_ID, sourceKey: 'vote-1', founderUserId: 101,
    checkedAt: '2026-08-25T11:00:00.000Z', evidenceHash: 'd'.repeat(64),
  };
  const key = sourceCertificationIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(sourceCertificationIdempotencyKey(input), key);
  assert.notEqual(sourceCertificationIdempotencyKey({ ...input, sourceKey: 'vote-2' }), key);
});
