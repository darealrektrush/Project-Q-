import assert from 'node:assert/strict';
import test from 'node:test';

import { confirmSolanaSignature } from '../src/campaign/solanaConfirmation.js';

test('Solana confirmation tolerates a transient RPC failure and returns only confirmed status', async () => {
  let calls = 0;
  const connection = { getSignatureStatuses: async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary DNS failure');
    return { value: [{ err: null, confirmationStatus: 'confirmed' }] };
  } };
  assert.equal(await confirmSolanaSignature(connection, 'test-signature', { maxAttempts: 2, pollIntervalMs: 0 }), 'test-signature');
});

test('Solana confirmation fails closed on chain error or ambiguous status', async () => {
  await assert.rejects(
    confirmSolanaSignature({ getSignatureStatuses: async () => ({ value: [{ err: { InstructionError: [0, 'Custom'] } }] }) }, 'failed', { maxAttempts: 1 }),
    /transaction failed/,
  );
  await assert.rejects(
    confirmSolanaSignature({ getSignatureStatuses: async () => ({ value: [null] }) }, 'unknown', { maxAttempts: 2, pollIntervalMs: 0 }),
    /ambiguous.*refusing automatic replay/,
  );
});
