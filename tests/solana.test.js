import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { isDistributableHolder, getHolderBalances } from '../src/lib/solana.js';

// Real mainnet addresses confirmed by hand against FAWKQ's actual holder set
// before this filter existed — the whole reason it exists. Keep these as a
// regression check: if isDistributableHolder ever stops excluding them, the
// distribution job goes back to paying the bonding curve instead of holders.
const PUMP_FUN_BONDING_CURVE = '5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM';
const TOKEN2022_OWNED_VAULT = '3zs3eEyuP5mfp46wdU9xu7Gz84KWY8drsiRvAkYSTVUH';
const KNOWN_REAL_WALLET = '9Dd6tTzkTyHgwprr3fhDzuo7HvZ5aWoRTeGXZLmXEGM9';

test('isDistributableHolder excludes the confirmed pump.fun bonding curve', () => {
  assert.equal(isDistributableHolder(PUMP_FUN_BONDING_CURVE), false);
});

test('isDistributableHolder excludes a confirmed Token-2022-owned vault account', () => {
  assert.equal(isDistributableHolder(TOKEN2022_OWNED_VAULT), false);
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
          { owner: TOKEN2022_OWNED_VAULT, amount: '30150000000000' },
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
