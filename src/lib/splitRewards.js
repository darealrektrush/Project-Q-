import { PublicKey } from '@solana/web3.js';
import { sendLamportTransfers } from './solana.js';
import { supabase } from './supabase.js';

export const STAGE1_RATIOS = { community: 75, dev: 15, ocean: 10 };
export const STAGE2_RATIOS = { bagWallet: 30, buybackReserve: 15, holders: 55 };

// Splits totalLamports across weights using the largest-remainder method, so
// the outputs always sum to exactly totalLamports (no lamports lost or
// invented to rounding). Used for both the fixed-ratio stage splits and the
// pro-rata holder payouts.
export function splitProRata(totalLamports, weights) {
  if (!Number.isFinite(totalLamports) || totalLamports < 0) {
    throw new Error('totalLamports must be a non-negative finite number');
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (totalLamports * w) / totalWeight);
  const floors = raw.map(Math.floor);
  const remainder = totalLamports - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let i = 0; i < remainder; i++) {
    result[order[i % order.length].index] += 1;
  }
  return result;
}

// Stage 1 (signed by CREATOR_WALLET_SECRET): community / dev / ocean.
export function computeStage1Split(totalLamports) {
  const [community, dev, ocean] = splitProRata(totalLamports, [
    STAGE1_RATIOS.community,
    STAGE1_RATIOS.dev,
    STAGE1_RATIOS.ocean,
  ]);
  return { community, dev, ocean };
}

// Stage 2 (signed by COMMUNITY_WALLET_SECRET): splits the Stage 1 community
// share again into bag wallet / buyback reserve / holders pool.
export function computeStage2Split(communityLamports) {
  const [bagWallet, buybackReserve, holders] = splitProRata(communityLamports, [
    STAGE2_RATIOS.bagWallet,
    STAGE2_RATIOS.buybackReserve,
    STAGE2_RATIOS.holders,
  ]);
  return { bagWallet, buybackReserve, holders };
}

// Pays the holders pool out pro-rata by token balance, in SOL (lamports).
export function computeHolderPayouts(holdersLamports, holders) {
  const amounts = splitProRata(
    holdersLamports,
    holders.map((h) => h.balance)
  );
  return holders.map((h, i) => ({ wallet: h.wallet, amount: amounts[i] }));
}

// Solana rejects any transaction that leaves a touched account with a
// lamport balance strictly between 0 and the rent-exempt minimum (~0.00089
// SOL) — a "dust" balance the runtime won't allow to exist. A brand-new/
// never-funded holder wallet (0 SOL already) whose pro-rata share lands in
// that gap fails simulation, and since transfers are batched into one
// transaction, that single bad transfer takes every other holder's payout
// in the same batch down with it. This is exactly what happened on FawkQ's
// first real mainnet distribution attempt (run #4, Stage 2: "insufficient
// funds for rent").
//
// Wraps computeHolderPayouts with a live check: excludes only holders
// whose *existing* balance plus their payout would still land in that gap
// — an already-funded wallet (balance already >= the minimum) can safely
// receive any positive top-up, however small, so it's never excluded just
// because its own share alone happens to be tiny. Excluded holders'
// share redistributes to the remaining eligible holders (re-running the
// pro-rata split over a shrunken set only ever increases everyone else's
// amount, so this can't manufacture a new dust case — one pass suffices).
export async function computeSafeHolderPayouts(connection, holdersLamports, holders) {
  let eligible = holders.filter((h) => h.balance > 0);
  if (!eligible.length) return [];

  const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
  const existingBalances = new Map(
    await Promise.all(
      eligible.map(async (h) => [h.wallet, await connection.getBalance(new PublicKey(h.wallet))])
    )
  );

  while (eligible.length) {
    const amounts = computeHolderPayouts(holdersLamports, eligible).map((p) => p.amount);
    const dustRisk = eligible.filter((h, i) => {
      const amount = amounts[i];
      return amount > 0 && existingBalances.get(h.wallet) + amount < rentExemptMinimum;
    });

    if (!dustRisk.length) {
      return eligible.map((h, i) => ({ wallet: h.wallet, amount: amounts[i] }));
    }
    eligible = eligible.filter((h) => !dustRisk.includes(h));
  }

  return [];
}

async function logTransactions({ runId, stage, fromWallet, batches }) {
  const rows = batches.flatMap((batch) =>
    batch.transfers.map((t) => ({
      run_id: runId,
      stage,
      role: t.role,
      from_wallet: fromWallet,
      to_wallet: t.to,
      amount_lamports: t.lamports,
      tx_signature: batch.signature,
    }))
  );
  if (rows.length) await supabase.insert('distribution_transactions', rows);
  return rows;
}

export async function runStage1({
  connection,
  creatorKeypair,
  totalLamports,
  communityWallet,
  devWallet,
  oceanWallet,
  runId,
}) {
  const split = computeStage1Split(totalLamports);
  const transfers = [
    { to: communityWallet, lamports: split.community, role: 'community' },
    { to: devWallet, lamports: split.dev, role: 'dev' },
    { to: oceanWallet, lamports: split.ocean, role: 'ocean' },
  ];

  const fromWallet = creatorKeypair.publicKey.toBase58();
  const transactions = [];
  const batches = await sendLamportTransfers({
    connection,
    fromKeypair: creatorKeypair,
    transfers,
    onBatch: async (batch) => {
      transactions.push(...(await logTransactions({ runId, stage: 1, fromWallet, batches: [batch] })));
    },
  });

  return { split, batches, transactions };
}

export async function runStage2({
  connection,
  communityKeypair,
  communityLamports,
  bagWallet,
  buybackWallet,
  holderBalances,
  runId,
}) {
  const split = computeStage2Split(communityLamports);
  const holderPayouts = await computeSafeHolderPayouts(connection, split.holders, holderBalances);

  const transfers = [
    { to: bagWallet, lamports: split.bagWallet, role: 'bag_wallet' },
    { to: buybackWallet, lamports: split.buybackReserve, role: 'buyback_reserve' },
    ...holderPayouts.map((h) => ({ to: h.wallet, lamports: h.amount, role: 'holder' })),
  ];

  const fromWallet = communityKeypair.publicKey.toBase58();
  const transactions = [];
  const batches = await sendLamportTransfers({
    connection,
    fromKeypair: communityKeypair,
    transfers,
    onBatch: async (batch) => {
      transactions.push(...(await logTransactions({ runId, stage: 2, fromWallet, batches: [batch] })));
    },
  });

  return { split, holderPayouts, batches, transactions };
}
