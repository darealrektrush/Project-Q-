import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverCampaignXpAwards } from '../src/campaign/oracleXpExport.js';

const row = {
  export_id: 7,
  profile_id: '11111111-1111-4111-8111-111111111111',
  telegram_user_id: 42,
  campaign_id: 'bond-the-duck-2026',
  cycle_id: 1,
  source: 'raid',
  mission_code: 'oracle-raids',
  campaign_score: 4,
  base_xp: 4,
  verification_state: 'verified',
  occurred_at: '2026-09-18T00:00:00.000Z',
  finalized_at: '2026-09-18T00:01:00.000Z',
  idempotency_key: 'project-q:xp-ledger:9',
  attempt_count: 0,
};
const env = {
  PROJECT_Q_ORACLE_XP_EXPORT_ENABLED: 'true',
  ORACLE_PROJECT_Q_XP_URL: 'https://oracle.example/project-q/xp-awards',
  ORACLE_PROJECT_Q_XP_SECRET: 's'.repeat(32),
};

test('delivers a bounded profile-keyed campaign XP event and records the receipt', async () => {
  const updates = [];
  const client = {
    select: async () => [row],
    update: async (...args) => { updates.push(args); return [{}]; },
  };
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, text: async () => JSON.stringify({
      ok: true, status: 'accepted', receipt_id: '22222222-2222-4222-8222-222222222222',
    }) };
  };
  const result = await deliverCampaignXpAwards(client, env, {
    fetchImpl, now: new Date('2026-09-18T00:05:00.000Z'),
  });
  assert.deepEqual(result, { delivered: 1, retried: 0, deadLettered: 0, disabled: false });
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.authorization, `Bearer ${'s'.repeat(32)}`);
  assert.deepEqual(JSON.parse(request.options.body), {
    profile_id: row.profile_id, telegram_user_id: 42, campaign_id: row.campaign_id,
    cycle_id: 1, mission_code: row.mission_code, source: 'raid', campaign_score: 4,
    base_xp: 4, verification_state: 'verified', occurred_at: row.occurred_at,
    finalized_at: row.finalized_at, idempotency_key: row.idempotency_key,
  });
  assert.equal(updates[0][2].status, 'delivered');
  assert.equal(updates[0][2].oracle_receipt_id, '22222222-2222-4222-8222-222222222222');
});

test('retries safe error codes and dead-letters the eighth failed attempt', async () => {
  const updates = [];
  const client = {
    select: async () => [{ ...row, attempt_count: 7 }],
    update: async (...args) => { updates.push(args); return [{}]; },
  };
  const fetchImpl = async () => ({ ok: false, status: 503, text: async () => '' });
  const result = await deliverCampaignXpAwards(client, env, {
    fetchImpl, now: new Date('2026-09-18T00:05:00.000Z'),
  });
  assert.equal(result.deadLettered, 1);
  assert.equal(updates[0][2].status, 'dead_letter');
  assert.equal(updates[0][2].attempt_count, 8);
  assert.equal(updates[0][2].last_error_code, 'http_5xx');
});

test('rejects malformed or oversized Oracle receipts without storing response details', async () => {
  for (const body of ['not-json', 'x'.repeat(65537)]) {
    const updates = [];
    const client = {
      select: async () => [row],
      update: async (...args) => { updates.push(args); return [{}]; },
    };
    const fetchImpl = async () => ({ ok: true, text: async () => body });
    const result = await deliverCampaignXpAwards(client, env, {
      fetchImpl, now: new Date('2026-09-18T00:05:00.000Z'),
    });
    assert.equal(result.retried, 1);
    assert.equal(updates[0][2].last_error_code, 'invalid_response');
    assert.equal(JSON.stringify(updates).includes(body), false);
  }
});

test('stays inert by default and rejects unsafe enabled configuration', async () => {
  const client = { select: async () => { throw new Error('should not read'); } };
  assert.equal((await deliverCampaignXpAwards(client, {})).disabled, true);
  await assert.rejects(
    () => deliverCampaignXpAwards(client, {
      PROJECT_Q_ORACLE_XP_EXPORT_ENABLED: 'true',
      ORACLE_PROJECT_Q_XP_URL: 'http://oracle.example/xp',
      ORACLE_PROJECT_Q_XP_SECRET: 'short',
    }),
    /not configured/
  );
  await assert.rejects(
    () => deliverCampaignXpAwards(client, {
      PROJECT_Q_ORACLE_XP_EXPORT_ENABLED: 'true',
      ORACLE_PROJECT_Q_XP_URL: '',
      ORACLE_PROJECT_Q_XP_SECRET: 's'.repeat(32),
    }),
    /not configured/
  );
});
