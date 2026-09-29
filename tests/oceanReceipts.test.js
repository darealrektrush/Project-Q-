import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { Keypair, SystemProgram } from '@solana/web3.js';
import { OCEAN_VAULT } from '../src/campaign/oceanVaultStatus.js';
import { oceanReceiptsEnabled, recordOceanContribution, listOceanContributions } from '../src/campaign/oceanReceipts.js';

const wallet = Keypair.generate().publicKey.toBase58();
const signature = bs58.encode(Buffer.alloc(64, 7));
const profile = 'a1eb5a56-3fbe-468b-b4b8-d98428b582d9';
const connection = {
  getGenesisHash: async () => '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  getParsedTransaction: async () => ({
    slot: 451602609, blockTime: 1790665214,
    meta: { err: null, preTokenBalances: [], innerInstructions: [] },
    transaction: { signatures: [signature], message: { accountKeys: [{ pubkey: wallet, signer: true }],
      instructions: [{ programId: SystemProgram.programId, parsed: { type: 'transfer',
        info: { source: wallet, destination: OCEAN_VAULT, lamports: '1500' } } }] } },
  }),
};

test('records only an independently verified finalized deposit through the canonical identity RPC', async () => {
  const client = {
    select: async (table, query) => {
      assert.equal(table, 'identity_links');
      assert.match(query, /telegram_user_id=eq\.42/);
      return [{ profile_id: profile, reward_wallet: wallet, wallet_verified_at: '2026-09-29T00:00:00Z' }];
    },
    rpc: async (name, args) => {
      assert.equal(name, 'record_ocean_contribution');
      assert.deepEqual(args.p_transfers, [{ asset: 'SOL', amountBaseUnits: '1500', decimals: 9 }]);
      assert.equal(args.p_wallet, wallet);
      return [{ id: 1, profile_id: profile, transaction_signature: signature, asset: 'SOL',
        amount_base_units: '1500', decimals: 9, block_time: args.p_block_time, founder_deposit: false }];
    },
  };
  const recorded = await recordOceanContribution(client, connection, {
    campaignId: 'bond-the-duck-2026', telegramUserId: 42, signature,
  });
  assert.equal(recorded.receipts[0].amountBaseUnits, '1500');
  assert.equal(recorded.proof.vault, OCEAN_VAULT);
});

test('fails closed if identity is unverified, transaction unmatched or block time missing', async () => {
  const args = { campaignId: 'bond-the-duck-2026', telegramUserId: 42, signature };
  const neverRpc = { select: async () => [], rpc: async () => { throw new Error('must not persist'); } };
  await assert.rejects(recordOceanContribution(neverRpc, connection, args), /verified profile and wallet/);
  const client = { ...neverRpc, select: async () => [{ profile_id: profile, reward_wallet: wallet, wallet_verified_at: 'ok' }] };
  assert.equal(await recordOceanContribution(client, { ...connection, getParsedTransaction: async () => null }, args), null);
  await assert.rejects(recordOceanContribution(client, { ...connection, getParsedTransaction: async () => ({
    ...(await connection.getParsedTransaction()), blockTime: null,
  }) }, args), /block time/);
});

test('receipt recording is restricted to the exact isolated Dev service and database', () => {
  assert.equal(oceanReceiptsEnabled({ RENDER_SERVICE_NAME: 'project-q-dev', SUPABASE_URL: 'https://awouccxagxglpvvuznxo.supabase.co' }), true);
  assert.equal(oceanReceiptsEnabled({ RENDER_SERVICE_NAME: 'project-q', SUPABASE_URL: 'https://awouccxagxglpvvuznxo.supabase.co' }), false);
  assert.equal(oceanReceiptsEnabled({ RENDER_SERVICE_NAME: 'project-q-dev', SUPABASE_URL: 'https://nspqztseiovkkdmqindu.supabase.co' }), false);
});

test('private history uses canonical profile and preserves full integer units', async () => {
  const rows = await listOceanContributions({
    select: async () => [{ profile_id: profile }],
    rpc: async (name, args) => {
      assert.equal(name, 'list_ocean_contribution_receipts');
      assert.equal(args.p_profile_id, profile);
      return [{ id: 3, asset: 'FAWKQ', amount_base_units: '18446744073709551615', decimals: 6,
        transaction_signature: signature, block_time: '2026-09-29T11:00:00Z', founder_deposit: false }];
    },
  }, { campaignId: 'bond-the-duck-2026', telegramUserId: 42 });
  assert.equal(rows[0].amountBaseUnits, '18446744073709551615');
  await assert.rejects(listOceanContributions({ select: async () => [], rpc: async () => { throw Error('must not query'); } },
    { campaignId: 'bond-the-duck-2026', telegramUserId: 42 }), /verified profile/);
});
