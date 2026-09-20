import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { submitSourceCertificationPacket } from '../src/campaign/sourceCertificationPackets.js';

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
  return {
    sourceKey: source.source_key,
    health: source.classification === 'PROOF_SUPPORTED' ? 'HEALTHY'
      : source.classification === 'COMMUNITY_PROGRESS_ONLY' ? 'DEGRADED'
        : 'OFFLINE',
    evidenceUrl: `https://evidence.example/${index + 1}`,
    evidenceHash: (index + 1).toString(16).padStart(64, 'a').slice(-64),
  };
}

const enabled = { PROJECT_Q_SOURCE_CERTIFICATION_PACKET_ENABLED: 'true' };

test('atomic source packet submission is disabled by default', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; } };
  await assert.rejects(submitSourceCertificationPacket(client, {
    sourceRows: sources,
    evidenceRows: sources.map(evidenceFor),
    founderUserId: 101,
    checkedAt: '2026-10-01T12:00:00Z',
    env: {},
  }), /submission disabled/);
  assert.equal(called, false);
});

test('incomplete packet never reaches the database', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; } };
  await assert.rejects(submitSourceCertificationPacket(client, {
    sourceRows: sources,
    evidenceRows: sources.slice(1).map((source, index) => evidenceFor(source, index + 1)),
    founderUserId: 101,
    checkedAt: '2026-10-01T12:00:00Z',
    env: enabled,
  }), /packet is incomplete/);
  assert.equal(called, false);
});

test('complete 14-source packet calls one atomic RPC', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ certificationCount: 14, complete: true }];
    },
  };
  const result = await submitSourceCertificationPacket(client, {
    sourceRows: sources,
    evidenceRows: sources.map(evidenceFor),
    founderUserId: 101,
    checkedAt: '2026-10-01T12:00:00Z',
    env: enabled,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fn, 'record_bond_source_certification_packet');
  assert.equal(calls[0].args.p_packets.length, 14);
  assert.equal(calls[0].args.p_founder_user_id, 101);
  assert.match(result.packetFingerprint, /^[0-9a-f]{64}$/);
});

test('atomic packet migration requires exact 14-source registry and one transaction', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920210000_atomic_bond_source_certification_packet.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /jsonb_array_length\(p_packets\) <> 14/);
  assert.match(sql, /source certification packet does not match the exact 14-source registry/);
  assert.match(sql, /duplicate source keys/);
  assert.match(sql, /record_verification_source_certification/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
});

test('Render keeps atomic source certification submission disabled by default', async () => {
  const yaml = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /PROJECT_Q_SOURCE_CERTIFICATION_PACKET_ENABLED[\s\S]*value: "false"/);
});
