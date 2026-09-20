import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { Keypair, SystemProgram } from '@solana/web3.js';

import {
  fetchAndVerifyNativeSolTransfer,
  verifyParsedNativeSolTransfer,
} from '../src/campaign/impactSolanaProof.js';

const source = Keypair.generate().publicKey.toBase58();
const recipient = Keypair.generate().publicKey.toBase58();
const signature = bs58.encode(Buffer.alloc(64, 7));

function transaction({
  destination = recipient,
  lamports = 1_000_000_000,
  transfers = 1,
} = {}) {
  return {
    slot: 123456789,
    blockTime: 1790000000,
    meta: { err: null, innerInstructions: [] },
    transaction: {
      message: {
        instructions: Array.from({ length: transfers }, () => ({
          programId: SystemProgram.programId,
          parsed: {
            type: 'transfer',
            info: { source, destination, lamports },
          },
        })),
      },
    },
  };
}

test('native SOL proof accepts exactly one finalized matching system transfer', () => {
  const proof = verifyParsedNativeSolTransfer({
    transaction: transaction(),
    signature,
    expectedRecipient: recipient,
    expectedLamports: '1000000000',
  });
  assert.equal(proof.recipient, recipient);
  assert.equal(proof.amountLamports, '1000000000');
  assert.equal(proof.slot, '123456789');
  assert.equal(proof.instructionType, 'system-transfer');
  assert.equal(proof.finalized, true);
});

test('native SOL proof fails closed on recipient, amount, failed tx or bundled transfers', () => {
  assert.throws(() => verifyParsedNativeSolTransfer({
    transaction: transaction({ destination: source }), signature,
    expectedRecipient: recipient, expectedLamports: '1000000000',
  }), /recipient/);
  assert.throws(() => verifyParsedNativeSolTransfer({
    transaction: transaction({ lamports: 100_000_000 }), signature,
    expectedRecipient: recipient, expectedLamports: '1000000000',
  }), /amount/);
  assert.throws(() => verifyParsedNativeSolTransfer({
    transaction: transaction({ transfers: 2 }), signature,
    expectedRecipient: recipient, expectedLamports: '1000000000',
  }), /exactly one/);
  const failed = transaction();
  failed.meta.err = { InstructionError: [0, 'Custom'] };
  assert.throws(() => verifyParsedNativeSolTransfer({
    transaction: failed, signature,
    expectedRecipient: recipient, expectedLamports: '1000000000',
  }), /missing or failed/);
});

test('fetch verifier requires finalized Solana status', async () => {
  const connection = {
    getSignatureStatuses: async () => ({ value: [{ confirmationStatus: 'finalized', err: null }] }),
    getParsedTransaction: async () => transaction(),
  };
  const proof = await fetchAndVerifyNativeSolTransfer(connection, signature, {
    recipient, amountLamports: '1000000000',
  });
  assert.equal(proof.recipient, recipient);

  await assert.rejects(fetchAndVerifyNativeSolTransfer({
    ...connection,
    getSignatureStatuses: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }),
  }, signature, {
    recipient, amountLamports: '1000000000',
  }), /not finalized/);
});
