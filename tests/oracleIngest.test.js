import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestOracleRaidEvent, secretMatches, validateOracleRaidEvent,
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
  assert.throws(() => validateOracleRaidEvent({ ...valid, telegram_user_id: 'bad' }), /telegram_user_id/);\n  assert.throws(() => validateOracleRaidEvent({ ...valid, verified_at: ['2026-08-15'] }), /verified_at/);\n  assert.throws(() => validateOracleRaidEvent({ ...valid, verified_at: '2999-01-01T00:00:00Z' }), /verified_at/);
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
