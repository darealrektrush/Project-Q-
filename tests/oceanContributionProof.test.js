import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { inspectOceanContribution, verifyOceanContribution } from '../src/campaign/oceanContributionProof.js';
import { OCEAN_VAULT, oceanVaultTokenAccounts } from '../src/campaign/oceanVaultStatus.js';
import { FAWKQ_MINT } from '../src/campaign/walletStatus.js';

const wallet = Keypair.generate().publicKey.toBase58();
const other = Keypair.generate().publicKey.toBase58();
const source = Keypair.generate().publicKey.toBase58();
const signature = bs58.encode(Buffer.alloc(64, 7));
const mainnet = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function transfer({ sourceWallet = wallet, destination = OCEAN_VAULT, amount = 1200 } = {}) {
  return { programId: SystemProgram.programId, parsed: { type: 'transfer', info: { source: sourceWallet, destination, lamports: amount } } };
}
function fixture(instructions = [transfer()]) {
  return {
    slot: 451602609, blockTime: 1790665214,
    meta: { err: null, preTokenBalances: [], innerInstructions: [] },
    transaction: {
      signatures: [signature],
      message: { accountKeys: [{ pubkey: wallet, signer: true }, { pubkey: source, signer: false }], instructions },
    },
  };
}

test('matches only finalized mainnet SOL transfer from the verified signer to the exact conservation vault', async () => {
  const transaction = fixture([transfer(), transfer({ amount: 300 }), transfer({ destination: other })]);
  const connection = {
    getGenesisHash: async () => mainnet,
    getParsedTransaction: async (_, options) => {
      assert.deepEqual(options, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
      return transaction;
    },
  };
  const proof = await verifyOceanContribution(connection, signature, wallet);
  assert.deepEqual(proof.transfers, [{ asset: 'SOL', amountBaseUnits: '1500', decimals: 9 }]);
  assert.equal(proof.vault, OCEAN_VAULT);
  assert.equal(proof.wallet, wallet);
  assert.equal(inspectOceanContribution(transaction, signature, other), null);
  transaction.transaction.message.accountKeys[0].signer = false;
  assert.equal(inspectOceanContribution(transaction, signature, wallet), null);
});

test('rejects failed, missing, wrong-signature and wrong-destination transactions', () => {
  const tx = fixture([transfer({ destination: other })]);
  assert.equal(inspectOceanContribution(tx, signature, wallet), null);
  tx.meta.err = { InstructionError: [0, 'Custom'] };
  assert.equal(inspectOceanContribution(tx, signature, wallet), null);
  tx.meta.err = null;
  assert.equal(inspectOceanContribution(tx, bs58.encode(Buffer.alloc(64, 8)), wallet), null);
  assert.equal(inspectOceanContribution(null, signature, wallet), null);
});

test('matches inner Token-2022 transfer only for wallet-owned mint and vault receiving account', () => {
  const tokenTransfer = { programId: TOKEN_2022_PROGRAM_ID,
    parsed: { type: 'transferChecked', info: {
      source, destination: oceanVaultTokenAccounts().FAWKQ, mint: FAWKQ_MINT,
      tokenAmount: { amount: '2300000', decimals: 6 },
    } } };
  const tx = fixture();
  tx.transaction.message.instructions = [];
  tx.meta.innerInstructions = [{ index: 0, instructions: [tokenTransfer] }];
  tx.meta.preTokenBalances = [{ accountIndex: 1, owner: wallet, mint: FAWKQ_MINT }];
  assert.deepEqual(inspectOceanContribution(tx, signature, wallet).transfers,
    [{ asset: 'FAWKQ', amountBaseUnits: '2300000', decimals: 6 }]);
  tx.meta.preTokenBalances[0].owner = other;
  assert.equal(inspectOceanContribution(tx, signature, wallet), null);
  tx.meta.preTokenBalances[0].owner = wallet;
  tokenTransfer.parsed.info.mint = other;
  assert.equal(inspectOceanContribution(tx, signature, wallet), null);
  tokenTransfer.parsed.info.mint = FAWKQ_MINT;
  tokenTransfer.parsed.info.destination = other;
  assert.equal(inspectOceanContribution(tx, signature, wallet), null);
});

test('invalid signature and wrong chain fail before transaction lookup', async () => {
  const connection = { getGenesisHash: async () => 'devnet', getParsedTransaction: async () => { throw new Error('must not query'); } };
  await assert.rejects(verifyOceanContribution(connection, 'bad', wallet), /invalid transaction signature/);
  await assert.rejects(verifyOceanContribution(connection, signature, wallet), /mainnet/);
});
