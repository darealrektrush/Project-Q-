import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { isDistributableHolder, getHolderBalances } from '../src/lib/solana.js';

// Real mainnet addresses confirmed by hand against FAWKQ's actual holder set
// before this filter existed — the whole reason it exists. Keep these as a
// regression check: if isDistributableHolder ever stops excluding them, the
// distribution job goes back to paying the bonding curve instead of holders.
const PUMP_FUN_BONDING_CURVE = '5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM';
// This is asoberspartan's Streamflow founder-lock escrow_tokens account
// (confirmed by reading it directly out of the lock contract's on-chain
// data) — off-curve/Token-2022-owned like the bonding curve, so it must
// stay excluded from holder payouts for the same reason: paying a locked-
// supply escrow pro-rata helps no one.
const FOUNDER_STREAMFLOW_ESCROW = '3zs3eEyuP5mfp46wdU9xu7Gz84KWY8drsiRvAkYSTVUH';
const KNOWN_REAL_WALLET = '9Dd6tTzkTyHgwprr3fhDzuo7HvZ5aWoRTeGXZLmXEGM9';

test('isDistributableHolder excludes the confirmed pump.fun bonding curve', () => {
  assert.equal(isDistributableHolder(PUMP_FUN_BONDING_CURVE), false);
});

test('isDistributableHolder excludes a confirmed founder Streamflow-lock escrow account', () => {
  assert.equal(isDistributableHolder(FOUNDER_STREAMFLOW_ESCROW), false);
});

test('isDistributableHolder accepts a confirmed real on-curve wallet', () => {
  assert.equal(isDistributableHolder(KNOWN_REAL_WALLET), true);
});

test('isDistributableHolder accepts freshly generated keypairs (always on-curve)', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(isDistributableHolder(Keypair.generate().publicKey.toBase58()), true);
  }
});

test('isDistributableHolder returns false instead of throwing on garbage input', () => {
  assert.equal(isDistributableHolder('not-a-real-pubkey'), false);
  assert.equal(isDistributableHolder(''), false);
});

test('getHolderBalances drops off-curve owners and keeps real wallets, aggregated', async () => {
  const realWallet = Keypair.generate().publicKey.toBase58();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.HELIUS_API_KEY;
  process.env.HELIUS_API_KEY = 'test-key';
  global.fetch = async () => ({
    json: async () => ({
      result: {
        token_accounts: [
          { owner: PUMP_FUN_BONDING_CURVE, amount: '700000000000000' },
          { owner: FOUNDER_STREAMFLOW_ESCROW, amount: '30150000000000' },
          { owner: realWallet, amount: '1000' },
          // Same real wallet holding across two separate token accounts —
          // should aggregate into one entry.
          { owner: realWallet, amount: '500' },
        ],
        cursor: undefined,
      },
    }),
  });

  try {
    const balances = await getHolderBalances('SomeMintAddress');
    assert.deepEqual(balances, [{ wallet: realWallet, balance: 1500 }]);
  } finally {
    global.fetch = originalFetch;
    process.env.HELIUS_API_KEY = originalApiKey;
  }
});

test('getHolderBalances also drops explicitly excluded wallets, e.g. the project\'s own operational wallets', async () => {
  const realHolder = Keypair.generate().publicKey.toBase58();
  const projectWallet = Keypair.generate().publicKey.toBase58();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.HELIUS_API_KEY;
  process.env.HELIUS_API_KEY = 'test-key';
  global.fetch = async () => ({
    json: async () => ({
      result: {
        token_accounts: [
          { owner: realHolder, amount: '1000' },
          { owner: projectWallet, amount: '999999' },
        ],
        cursor: undefined,
      },
    }),
  });

  try {
    const balances = await getHolderBalances('SomeMintAddress', { excludeWallets: [projectWallet] });
    assert.deepEqual(balances, [{ wallet: realHolder, balance: 1000 }]);
  } finally {
    global.fetch = originalFetch;
    process.env.HELIUS_API_KEY = originalApiKey;
  }
});
