import assert from 'node:assert/strict';
import test from 'node:test';

import { isTransientSolanaRpcError, withSolanaRpcRetry } from '../src/campaign/solanaRpcRetry.js';

test('Solana RPC retry backs off for 429 responses and eventually succeeds', async () => {
  let calls = 0;
  const delays = [];
  const result = await withSolanaRpcRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('429 Too Many Requests');
    return 'ok';
  }, {
    maxAttempts: 3,
    initialDelayMs: 10,
    sleep: async (delay) => delays.push(delay),
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});

test('Solana RPC retry does not retry deterministic or authorization failures', async () => {
  let calls = 0;
  await assert.rejects(withSolanaRpcRetry(async () => {
    calls += 1;
    throw new Error('transaction failed: custom program error');
  }, { sleep: async () => {} }), /custom program error/);
  assert.equal(calls, 1);
  assert.equal(isTransientSolanaRpcError(new Error('EAI_AGAIN')), true);
  assert.equal(isTransientSolanaRpcError(new Error('invalid authority')), false);
});
