import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestParticipationEvent, validateParticipationEvent } from '../src/campaign/participationIngest.js';

test('participation event validation normalizes and creates a stable idempotency key', () => {
  const body = {
    source: 'VOTE', source_key: 'dexscreener', telegram_user_id: 123,
    evidence_ref: 'https://dexscreener.com/vote/abc', verified_at: '2026-08-17T00:00:00Z',
  };
  const first = validateParticipationEvent(body);
  const second = validateParticipationEvent(body);
  assert.equal(first.source, 'vote');
  assert.equal(first.sourceKey, 'dexscreener');
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.idempotencyKey, 'participation:dexscreener:123:https://dexscreener.com/vote/abc');
});

test('participation event validation rejects unknown sources and bad shapes', () => {
  const valid = {
    source: 'event', source_key: 'major-buy-bot', telegram_user_id: 123,
    evidence_ref: 'msg-1', verified_at: '2026-08-17T00:00:00Z',
  };
  assert.throws(() => validateParticipationEvent({ ...valid, source: 'raid' }), /invalid source/);
  assert.throws(() => validateParticipationEvent({ ...valid, telegram_user_id: 'bad' }), /telegram_user_id/);
  assert.throws(() => validateParticipationEvent({ ...valid, source_key: '' }), /invalid source_key/);
  assert.throws(() => validateParticipationEvent({ ...valid, verified_at: ['2026-08-17'] }), /verified_at/);
  assert.throws(() => validateParticipationEvent({ ...valid, verified_at: '2999-01-01T00:00:00Z' }), /verified_at/);
});

test('validated event is sent only through the atomic ingest RPC', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push([fn, args]); return [{ id: 1 }]; } };
  const event = validateParticipationEvent({
    source: 'vote', source_key: 'geckoterminal', telegram_user_id: 123,
    evidence_ref: 'https://geckoterminal.com/vote/xyz', verified_at: '2026-08-17T00:00:00Z',
  });
  assert.deepEqual(await ingestParticipationEvent(client, event), [{ id: 1 }]);
  assert.equal(calls[0][0], 'ingest_campaign_participation_event');
  assert.equal(calls[0][1].p_source, 'vote');
  assert.equal(calls[0][1].p_source_key, 'geckoterminal');
});
