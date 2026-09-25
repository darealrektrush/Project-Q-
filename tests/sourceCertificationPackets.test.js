import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSourceCertificationPackets,
  summarizeSourceCertificationPackets,
} from '../src/campaign/sourceCertificationPackets.js';

const sources = Array.from({ length: 14 }, (_, index) => ({
  campaign_id: 'bond-the-duck-2026',
  source_key: index < 9 ? `web:${index + 1}` : `telegram:${index - 8}`,
  source: index < 9 ? 'vote' : 'event',
  classification: index < 3 || index >= 9 ? 'PROOF_SUPPORTED'
    : index === 3 ? 'COMMUNITY_PROGRESS_ONLY'
      : 'SOURCE_UNAVAILABLE',
  target_url: `https://example.com/${index + 1}`,
}));

function evidenceFor(source, index) {
  const classification = source.classification;
  const health = classification === 'PROOF_SUPPORTED' ? 'HEALTHY'
    : classification === 'COMMUNITY_PROGRESS_ONLY' ? 'DEGRADED'
      : 'OFFLINE';
  return {
    sourceKey: source.source_key,
    health,
    evidenceUrl: `https://evidence.example/${index + 1}`,
    evidenceHash: String(index + 1).padStart(64, 'a').slice(-64),
  };
}

test('complete packet set requires exactly 14 ready sources', () => {
  const evidence = sources.map(evidenceFor);
  const packets = buildSourceCertificationPackets(sources, evidence, {
    founderUserId: 8560606243,
    checkedAt: '2026-10-01T12:00:00Z',
  });
  const summary = summarizeSourceCertificationPackets(packets);
  assert.equal(summary.complete, true);
  assert.deepEqual(summary.counts, { READY: 14, MISSING: 0, INVALID: 0 });
  assert.match(summary.fingerprint, /^[0-9a-f]{64}$/);
});

test('missing evidence remains visibly missing and never receives an idempotency key', () => {
  const evidence = sources.slice(1).map((source, index) => evidenceFor(source, index + 1));
  const packets = buildSourceCertificationPackets(sources, evidence, {
    founderUserId: 8560606243,
    checkedAt: '2026-10-01T12:00:00Z',
  });
  assert.equal(packets[0].status, 'MISSING');
  assert.equal(packets[0].idempotencyKey, null);
  assert.equal(summarizeSourceCertificationPackets(packets).complete, false);
});

test('classification-health mismatch is invalid before any database write', () => {
  const evidence = sources.map(evidenceFor);
  evidence[4].health = 'HEALTHY';
  const packets = buildSourceCertificationPackets(sources, evidence, {
    founderUserId: 8560606243,
    checkedAt: '2026-10-01T12:00:00Z',
  });
  assert.equal(packets[4].status, 'INVALID');
  assert.match(packets[4].reasons.join(' '), /health does not match/);
});

test('a certification packet rejects duplicate or unregistered source evidence', () => {
  const evidence = sources.map(evidenceFor);
  assert.throws(() => buildSourceCertificationPackets(sources, [...evidence, evidence[0]], {
    founderUserId: 8560606243,
  }), /duplicate certification evidence/);
  assert.throws(() => buildSourceCertificationPackets(sources, [
    ...evidence, { ...evidence[0], sourceKey: 'web:unregistered' },
  ], { founderUserId: 8560606243 }), /unknown certification source/);
});

test('packet fingerprint is deterministic for identical source evidence', () => {
  const evidence = sources.map(evidenceFor);
  const left = buildSourceCertificationPackets(sources, evidence, {
    founderUserId: 8560606243,
    checkedAt: '2026-10-01T12:00:00Z',
  });
  const right = buildSourceCertificationPackets(sources, evidence, {
    founderUserId: 8560606243,
    checkedAt: '2026-10-01T12:00:00Z',
  });
  assert.equal(
    summarizeSourceCertificationPackets(left).fingerprint,
    summarizeSourceCertificationPackets(right).fingerprint
  );
});
