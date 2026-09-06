import test from 'node:test';
import assert from 'node:assert/strict';
import { oracleProfileHandler, oracleProfileAppHandler } from '../src/campaign/oracleProfile.js';

test('app link resolves the actual bot once, keeps credentials private and requires auth', async () => {
  let calls = 0;
  const handler = oracleProfileAppHandler({ secret: 'server-secret', botToken: 'private-token', fetchImpl: async () => {
    calls++;
    return { ok: true, json: async () => ({ ok: true, result: { is_bot: true, username: 'ProjectQTestBot' } }) };
  } });
  const denied = response();
  await handler(req({}, 'wrong'), denied);
  assert.equal(denied.code, 401);
  assert.equal(calls, 0);
  for (let i = 0; i < 2; i++) {
    const res = response();
    await handler(req({}), res);
    assert.equal(res.body.appUrl, 'https://t.me/ProjectQTestBot?start=campaigns');
    assert.doesNotMatch(JSON.stringify(res.body), /private-token/);
  }
  assert.equal(calls, 1);
});

function response() {
  return { headers: {}, set(k, v) { this.headers[k] = v; return this; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
const req = (body, secret = 'server-secret') => ({ body, get: () => secret });
test('requires the configured bridge secret before reading private records', async () => {
  for (const secret of [undefined, '', 'wrong']) {
    let reads = 0;
    const handler = oracleProfileHandler({ secret: 'server-secret', getParticipantStatus: () => { reads++; } });
    const res = response();
    await handler(req({ telegram_user_id: 7 }, secret ?? ''), res);
    assert.equal(res.code, 401);
    assert.equal(reads, 0);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }
});
test('rejects unsafe IDs and extra identity selectors', async () => {
  for (const body of [{ telegram_user_id: '7' }, { telegram_user_id: -7 }, {},
    { telegram_user_id: 7, wallet: 'other' }, { telegram_user_id: Number.MAX_SAFE_INTEGER + 1 }]) {
    const res = response();
    await oracleProfileHandler({ secret: 'server-secret', getParticipantStatus: () => assert.fail('must not read') })(req(body), res);
    assert.equal(res.code, 400);
  }
});
test('projects bounded records and does not expose wallet or unrelated identity fields', async () => {
  let actor;
  const handler = oracleProfileHandler({ secret: 'server-secret', getParticipantStatus: async id => {
    actor = id;
    return { enrolled: true, walletVerified: true, xVerified: true, campaignState: 'ACTIVE', totalXp: 40,
      completedMissionCount: 2, rewardWallet: 'private-wallet', x_user_id: 'private-X',
      rewards: { releases: Array.from({ length: 8 }, (_, i) => ({ status: 'scheduled', amountBaseUnits: '1000000',
        scheduledAt: `2026-09-${10 + i}`, transactionSignature: null, privateNote: 'never-export' })) } };
  }, now: () => new Date('2026-09-06T00:00:00Z') });
  const res = response();
  await handler(req({ telegram_user_id: 7 }), res);
  assert.equal(actor, 7);
  assert.equal(res.code, 200);
  assert.equal(res.body.profile.telegramUserId, 7);
  assert.equal(res.body.profile.releases.length, 3);
  assert.equal(res.body.profile.releases[0].scheduledAt, '2026-09-17');
  assert.equal(res.body.profile.observedAt, '2026-09-06T00:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(res.body), /private|never-export/);
});
test('outages never become an empty or ineligible member record', async () => {
  for (const getParticipantStatus of [async () => { throw Error('sensitive database error'); }, async () => ({ unavailable: true })]) {
    const res = response();
    await oracleProfileHandler({ secret: 'server-secret', getParticipantStatus })(req({ telegram_user_id: 7 }), res);
    assert.equal(res.code, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /sensitive/);
  }
});
