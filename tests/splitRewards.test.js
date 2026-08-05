import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import {
  splitProRata,
  computeStage1Split,
  computeStage2Split,
  computeHolderPayouts,
  computeSafeHolderPayouts,
} from '../src/lib/splitRewards.js';

const RENT_EXEMPT_MINIMUM = 890_880; // current mainnet minimum for a 0-byte account

function mockConnection(existingBalances = new Map()) {
  return {
    getMinimumBalanceForRentExemption: async () => RENT_EXEMPT_MINIMUM,
    getBalance: async (pubkey) => existingBalances.get(pubkey.toBase58()) ?? 0,
  };
}

test('splitProRata sums exactly to the total, no lamports lost to rounding', () => {
  const result = splitProRata(1000, [75, 15, 10]);
  assert.deepEqual(result, [750, 150, 100]);
  assert.equal(result.reduce((a, b) => a + b, 0), 1000);
});

test('splitProRata handles totals that do not divide evenly', () => {
  const result = splitProRata(1, [1, 1, 1]);
  assert.equal(result.reduce((a, b) => a + b, 0), 1);
  assert.equal(result.filter((n) => n === 1).length, 1);
});

test('splitProRata returns all zeros when total weight is zero', () => {
  assert.deepEqual(splitProRata(1000, [0, 0, 0]), [0, 0, 0]);
});

test('splitProRata handles zero total', () => {
  assert.deepEqual(splitProRata(0, [75, 15, 10]), [0, 0, 0]);
});

test('splitProRata rejects a negative total', () => {
  assert.throws(() => splitProRata(-1, [1, 1]));
});

test('computeStage1Split is 75/15/10 and sums to the total', () => {
  const split = computeStage1Split(1_000_000_000);
  assert.deepEqual(split, { community: 750_000_000, dev: 150_000_000, ocean: 100_000_000 });
  assert.equal(split.community + split.dev + split.ocean, 1_000_000_000);
});

test('computeStage1Split holds exactly under odd totals', () => {
  const total = 999_999_997;
  const split = computeStage1Split(total);
  assert.equal(split.community + split.dev + split.ocean, total);
});

test('computeStage2Split is 30/15/55 and sums to the community share', () => {
  const split = computeStage2Split(750_000_000);
  assert.deepEqual(split, { bagWallet: 225_000_000, buybackReserve: 112_500_000, holders: 412_500_000 });
  assert.equal(split.bagWallet + split.buybackReserve + split.holders, 750_000_000);
});

test('computeStage2Split holds exactly under odd totals', () => {
  const total = 412_500_001;
  const split = computeStage2Split(total);
  assert.equal(split.bagWallet + split.buybackReserve + split.holders, total);
});

test('computeHolderPayouts pays out pro-rata by balance and sums exactly', () => {
  const holders = [
    { wallet: 'A', balance: 500 },
    { wallet: 'B', balance: 300 },
    { wallet: 'C', balance: 200 },
  ];
  const payouts = computeHolderPayouts(1_000_000, holders);
  assert.deepEqual(
    payouts.map((p) => p.wallet),
    ['A', 'B', 'C']
  );
  assert.equal(payouts.reduce((sum, p) => sum + p.amount, 0), 1_000_000);
  // Largest balance should receive the largest payout.
  assert.ok(payouts[0].amount > payouts[1].amount);
  assert.ok(payouts[1].amount > payouts[2].amount);
});

test('computeHolderPayouts gives everything to a single holder', () => {
  const payouts = computeHolderPayouts(999, [{ wallet: 'solo', balance: 42 }]);
  assert.deepEqual(payouts, [{ wallet: 'solo', amount: 999 }]);
});

test('computeHolderPayouts handles an empty holder set', () => {
  assert.deepEqual(computeHolderPayouts(1000, []), []);
});

test('computeSafeHolderPayouts matches computeHolderPayouts when everyone is already funded above the rent-exempt minimum', async () => {
  const holders = [
    { wallet: Keypair.generate().publicKey.toBase58(), balance: 500 },
    { wallet: Keypair.generate().publicKey.toBase58(), balance: 300 },
    { wallet: Keypair.generate().publicKey.toBase58(), balance: 200 },
  ];
  const existing = new Map(holders.map((h) => [h.wallet, 5_000_000]));
  const safe = await computeSafeHolderPayouts(mockConnection(existing), 10_000_000, holders);
  const plain = computeHolderPayouts(10_000_000, holders);
  assert.deepEqual(safe, plain);
});

test('computeSafeHolderPayouts excludes a never-funded wallet whose tiny share would land in the dust gap, redistributing it', async () => {
  const whale = Keypair.generate().publicKey.toBase58();
  const dustRisk = Keypair.generate().publicKey.toBase58();
  const holders = [
    { wallet: whale, balance: 999_000 },
    { wallet: dustRisk, balance: 1_000 }, // tiny share of a huge pool -> payout << rent-exempt minimum
  ];
  // Neither wallet has ever held SOL before.
  const payouts = await computeSafeHolderPayouts(mockConnection(new Map()), 100_000_000, holders);

  assert.deepEqual(
    payouts.map((p) => p.wallet),
    [whale]
  );
  // The dust-risk holder's would-be share redistributes to the whale — the
  // pool still sums exactly, nothing is lost.
  assert.equal(payouts[0].amount, 100_000_000);
});

test('computeSafeHolderPayouts does not exclude a wallet that already clears the rent-exempt minimum, however tiny its own payout', async () => {
  const whale = Keypair.generate().publicKey.toBase58();
  const alreadyFunded = Keypair.generate().publicKey.toBase58();
  const holders = [
    { wallet: whale, balance: 999_000 },
    { wallet: alreadyFunded, balance: 1_000 },
  ];
  const existing = new Map([[alreadyFunded, 5_000_000]]); // well above the minimum already
  const payouts = await computeSafeHolderPayouts(mockConnection(existing), 100_000_000, holders);

  assert.deepEqual(
    payouts.map((p) => p.wallet),
    [whale, alreadyFunded]
  );
  assert.equal(
    payouts.reduce((sum, p) => sum + p.amount, 0),
    100_000_000
  );
});

test('computeSafeHolderPayouts handles an empty holder set', async () => {
  assert.deepEqual(await computeSafeHolderPayouts(mockConnection(), 1000, []), []);
});

test('computeSafeHolderPayouts excludes holders with a zero balance the same way computeHolderPayouts implicitly does', async () => {
  const real = Keypair.generate().publicKey.toBase58();
  const zeroBalance = Keypair.generate().publicKey.toBase58();
  const holders = [
    { wallet: real, balance: 1000 },
    { wallet: zeroBalance, balance: 0 },
  ];
  const existing = new Map([[real, 5_000_000]]);
  const payouts = await computeSafeHolderPayouts(mockConnection(existing), 1_000_000, holders);
  assert.deepEqual(
    payouts.map((p) => p.wallet),
    [real]
  );
});
