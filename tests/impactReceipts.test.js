import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { Keypair, SystemProgram } from '@solana/web3.js';

import {
  finalizeTopContributor,
  getImpactReceiptState,
  verifyAndRecordImpactReceipt,
} from '../src/campaign/impactReceipts.js';

const recipient = Keypair.generate().publicKey.toBase58();
const source = Keypair.generate().publicKey.toBase58();
const signature = bs58.encode(Buffer.alloc(64, 8));

test('impact mutations are disabled by default', async () => {
  const client = { rpc: async () => { throw new Error('must not call'); } };
  await assert.rejects(finalizeTopContributor(client, {
    founderUserId: 101, env: {},
  }), /disabled/);
});

test('finalize top contributor calls only the audited RPC when enabled', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ telegram_user_id: 9001, total_xp: 100 }];
    },
  };
  const row = await finalizeTopContributor(client, {
    founderUserId: 101,
    env: { PROJECT_Q_IMPACT_RECEIPTS_ENABLED: 'true' },
  });
  assert.equal(row.total_xp, 100);
  assert.equal(calls[0].fn, 'finalize_campaign_top_contributor');
});

test('verified SOL receipt is written only after finalized exact transfer proof', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ id: 7, proof_hash: 'a'.repeat(64), ...args }];
    },
  };
  const connection = {
    getSignatureStatuses: async () => ({ value: [{ confirmationStatus: 'finalized', err: null }] }),
    getParsedTransaction: async () => ({
      slot: 444,
      blockTime: 1790000000,
      meta: { err: null, innerInstructions: [] },
      transaction: {
        message: {
          instructions: [{
            programId: SystemProgram.programId,
            parsed: { type: 'transfer', info: { source, destination: recipient, lamports: 1000000000 } },
          }],
        },
      },
    }),
  };

  const result = await verifyAndRecordImpactReceipt(client, connection, {
    receiptType: 'WINNER_PRIZE',
    recipient,
    amountLamports: '1000000000',
    signature,
    founderUserId: 101,
    env: { PROJECT_Q_IMPACT_RECEIPTS_ENABLED: 'true' },
  });
  assert.equal(calls[0].fn, 'record_verified_campaign_impact_receipt');
  assert.equal(calls[0].args.p_amount_lamports, 1000000000);
  assert.equal(calls[0].args.p_proof.finalized, true);
  assert.equal('p_proof_hash' in calls[0].args, false);
  assert.equal(result.proofHash, 'a'.repeat(64));
});

test('impact receipt state requires both separate exact receipts', async () => {
  const client = {
    select: async (table) => {
      if (table === 'campaign_top_contributor_finalizations') return [{
        campaign_id: 'bond-the-duck-2026', telegram_user_id: 1, profile_id: 'p',
        reward_wallet: recipient, total_xp: 100, finalized_at: '2026-10-20T00:00:00Z',
      }];
      if (table === 'campaign_impact_receipts') return [
        { receipt_type: 'WINNER_PRIZE', amount_lamports: '1000000000' },
        { receipt_type: 'CONSERVATION_IMPACT', amount_lamports: '100000000' },
      ];
      return [];
    },
  };
  const state = await getImpactReceiptState(client);
  assert.equal(state.complete, true);
});
