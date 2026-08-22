import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestOracleRaidEvent, linkOracleIdentity, secretMatches,
  validateOracleIdentityEvent, validateOracleRaidEvent,
} from '../src/campaign/oracleIngest.js';

test('Oracle shared secret comparison fails closed', () => {
  assert.equal(secretMatches('same', 'same'), true);
  assert.equal(secretMatches('wrong', 'same'), false);
  assert.equal(secretMatches('', 'same'), false);
  assert.equal(secretMatches('same', ''), false);
});

test('Oracle event validation canonicalizes and creates stable idempotency', () => {
  const body = {
    raid_id: 'raid-1', telegram_user_id: 123, x_user_id: 'x-1',
    action: 'RETWEET', tweet_id: 'tweet-1', verified_at: '2026-08-15T00:00:00Z',
  };
  const first = validateOracleRaidEvent(body);
  const second = validateOracleRaidEvent(body);
  assert.equal(first.action, 'retweet');
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.idempotencyKey.length, 64);
});

test('Oracle event validation rejects unknown actions and identities', () => {
  const valid = {
    raid_id: 'r', telegram_user_id: 123, x_user_id: 'x', action: 'like',
    tweet_id: 't', verified_at: '2026-08-15T00:00:00Z',
  };
  assert.throws(() => validateOracleRaidEvent({ ...valid, action: 'follow' }), /invalid action/);
  assert.throws(() => validateOracleRaidEvent({ ...valid, telegram_user_id: 'bad' }), /telegram_user_id/);
  assert.throws(() => validateOracleRaidEvent({ ...valid, verified_at: ['2026-08-15'] }), /verified_at/);
  assert.throws(() => validateOracleRaidEvent({ ...valid, verified_at: '2999-01-01T00:00:00Z' }), /verified_at/);
});

test('validated event is sent only through the atomic ingest RPC', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push([fn, args]); return [{ id: 1 }]; } };
  const event = validateOracleRaidEvent({
    raid_id: 'r', telegram_user_id: 123, x_user_id: 'x', action: 'like',
    tweet_id: 't', verified_at: '2026-08-15T00:00:00Z',
  });
  assert.deepEqual(await ingestOracleRaidEvent(client, event), [{ id: 1 }]);
  assert.equal(calls[0][0], 'ingest_oracle_raid_event');
});

test('Oracle identity validation normalizes permanent identities', () => {
  const identity = validateOracleIdentityEvent({
    telegram_user_id: 123,
    x_user_id: '22446688',
    verified_at: '2026-08-15T00:00:00Z',
  });
  assert.deepEqual(identity, {
    telegramUserId: 123,
    xUserId: '22446688',
    verifiedAt: '2026-08-15T00:00:00.000Z',
  });
  assert.throws(() => validateOracleIdentityEvent({
    telegram_user_id: 'bad', x_user_id: '22446688', verified_at: '2026-08-15T00:00:00Z',
  }), /telegram_user_id/);
  assert.throws(() => validateOracleIdentityEvent({
    telegram_user_id: 123, x_user_id: '', verified_at: '2026-08-15T00:00:00Z',
  }), /x_user_id/);
  assert.throws(() => validateOracleIdentityEvent({
    telegram_user_id: 123, x_user_id: '@changeable_handle', verified_at: '2026-08-15T00:00:00Z',
  }), /x_user_id/);
});

test('validated Oracle identity is sent only through the atomic link RPC', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push([fn, args]); return [{ x_user_id: '22446688' }]; } };
  const identity = validateOracleIdentityEvent({
    telegram_user_id: 123, x_user_id: '22446688', verified_at: '2026-08-15T00:00:00Z',
  });
  assert.deepEqual(await linkOracleIdentity(client, identity), [{ x_user_id: '22446688' }]);
  assert.equal(calls[0][0], 'link_oracle_identity');
  assert.equal(calls[0][1].p_telegram_user_id, 123);
});
