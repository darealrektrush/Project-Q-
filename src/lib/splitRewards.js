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
//
// A SOL transfer that would leave a recipient below the rent-exempt minimum
// fails the WHOLE transaction with "insufficient funds for rent", so one dust
// holder blows up the entire Stage 2 batch. minPayoutLamports drops payouts
// below that floor; the skipped dust simply stays in the community wallet and
// rolls into the next cycle rather than failing the run. Defaults to 0 (no
// filtering) to preserve pure-accounting callers/tests.
export function computeHolderPayouts(holdersLamports, holders, minPayoutLamports = 0) {
  const amounts = splitProRata(
    holdersLamports,
    holders.map((h) => h.balance)
  );
  return holders
    .map((h, i) => ({ wallet: h.wallet, amount: amounts[i] }))
    .filter((p) => p.amount >= minPayoutLamports);
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

  // Skip holder payouts below the rent-exempt minimum. Sending a recipient less
  // than this (e.g. a dust pro-rata share) leaves their account non-rent-exempt
  // and fails the entire transaction, so one tiny holder would otherwise take
  // down the whole Stage 2 batch. Skipped dust stays in the community wallet.
  const rentExemptMinLamports = await connection.getMinimumBalanceForRentExemption(0);
  const holderPayouts = computeHolderPayouts(split.holders, holderBalances, rentExemptMinLamports);

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
