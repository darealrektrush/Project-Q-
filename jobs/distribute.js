import 'dotenv/config';
import * as solana from '../src/lib/solana.js';
import { runStage1, runStage2 } from '../src/lib/splitRewards.js';
import { supabase } from '../src/lib/supabase.js';
import * as telegram from '../src/lib/telegram.js';
import { formatDistributionTweet, tryPostTweet } from '../src/lib/twitter.js';
const lamportsToSol = solana.lamportsToSol;
const MIN_DISTRIBUTION_INTERVAL_MS = 72 * 60 * 60 * 1000;
const FIRST_DISTRIBUTION_TIME = new Date('2026-08-04T14:00:00-07:00'); // Aug 4, 2026 2:00 PM Pacific Time (PDT/UTC-7); every 72h after that
// Cron schedules are calendar-based and can't express a true rolling "every
// 72 hours" (render.yaml runs this check every 3h). This guard makes the
// actual 72h interval real: it skips the run unless that much time has
// genuinely elapsed since the last completed distribution.
async function hasMinIntervalElapsed() {
  if (Date.now() < FIRST_DISTRIBUTION_TIME.getTime()) {
    console.log(`Skipping distribution: first scheduled run is ${FIRST_DISTRIBUTION_TIME.toISOString()}, not yet reached.`);
    return false;
  }

  const [lastRun] = await supabase.select(
    'distribution_runs',
    '?status=eq.completed&order=completed_at.desc&limit=1'
  );
  if (!lastRun?.completed_at) return true;

  const elapsedMs = Date.now() - new Date(lastRun.completed_at).getTime();
  if (elapsedMs >= MIN_DISTRIBUTION_INTERVAL_MS) return true;

  const hoursElapsed = (elapsedMs / 3_600_000).toFixed(1);
  const hoursLeft = ((MIN_DISTRIBUTION_INTERVAL_MS - elapsedMs) / 3_600_000).toFixed(1);
  console.log(
    `Skipping distribution — last completed run was ${hoursElapsed}h ago; ${hoursLeft}h remaining until the next 72h window.`
  );
  return false;
}

function solscanTxUrl(signature) {
  return `https://solscan.io/tx/${signature}`;
}

// Best-effort: turn a completed distribution into a public X "receipt" post.
// Never throws — a marketing failure must not fail (or unwind) a money-moving
// run that already landed on-chain.
async function autoPostToX({ totalLamports, stage1, stage2 }) {
  try {
    const stage2Signatures = [...new Set(stage2.batches.map((b) => b.signature))];
    // Link the holder-payout tx when there is one; otherwise the Stage 1 tx.
    const linkSignature =
      stage2Signatures[0] ?? [...new Set(stage1.batches.map((b) => b.signature))][0];
    if (!linkSignature) return;

    const tweet = formatDistributionTweet({
      totalSol: lamportsToSol(totalLamports),
      holdersCount: stage2.holderPayouts.length,
      oceanSol: lamportsToSol(stage1.split.ocean),
      solscanUrl: solscanTxUrl(linkSignature),
    });
    const result = await tryPostTweet(tweet);
    if (result.ok) console.log(`Posted distribution receipt to X: ${result.id}`);
  } catch (err) {
    console.error('auto-post to X failed', err);
  }
}

function formatRecap({ totalLamports, stage1, stage2 }) {
  const stage1Signatures = [...new Set(stage1.batches.map((b) => b.signature))];
  const stage2Signatures = [...new Set(stage2.batches.map((b) => b.signature))];

  return [
    '📡 *FawkQ Distribution Recap*',
    `Total distributed: ${lamportsToSol(totalLamports).toFixed(4)} SOL`,
    '',
    '_Stage 1 — creator wallet_',
    `Community: ${lamportsToSol(stage1.split.community).toFixed(4)} SOL`,
    `Dev: ${lamportsToSol(stage1.split.dev).toFixed(4)} SOL`,
    `Ocean conservation: ${lamportsToSol(stage1.split.ocean).toFixed(4)} SOL`,
    ...stage1Signatures.map((sig) => solscanTxUrl(sig)),
    '',
    '_Stage 2 — community wallet_',
    `Bag wallet: ${lamportsToSol(stage2.split.bagWallet).toFixed(4)} SOL`,
    `Buyback reserve: ${lamportsToSol(stage2.split.buybackReserve).toFixed(4)} SOL`,
    `Holders (${stage2.holderPayouts.length}): ${lamportsToSol(stage2.split.holders).toFixed(4)} SOL`,
    ...stage2Signatures.map((sig) => solscanTxUrl(sig)),
  ].join('\n');
}

async function alertFailure({ runId, stage, err }) {
  try {
    const message = [
      `🚨 *Distribution run #${runId} failed*${stage ? ` in Stage ${stage}` : ''}`,
      telegram.escapeMarkdown(String(err?.message ?? err)),
      '',
      `Check \`distribution_transactions\` for \`run_id=${runId}\` to see what already landed on-chain before retrying.`,
    ].join('\n');
    await telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
      threadId: telegram.getTopicId('fawkq-announcements'),
    });
  } catch (alertErr) {
    console.error('failed to send distribution failure alert', alertErr);
  }
}

// If the most recent run got as far as landing Stage 1 on-chain (creator ->
// community/dev/ocean) but failed in Stage 2, that money is sitting in the
// community wallet doing nothing — re-running from scratch would check the
// creator wallet's balance (now just the reserve), find nothing to
// distribute, and silently no-op forever, stranding it. Reconstructs the
// original Stage 1 result from distribution_transactions (rather than
// re-reading the community wallet's live balance, which could have drifted
// for unrelated reasons) so Stage 2 can be retried against exactly what
// Stage 1 actually sent.
async function findResumableRun() {
  const [lastRun] = await supabase.select('distribution_runs', '?select=*&order=id.desc&limit=1');
  if (!lastRun || lastRun.status !== 'failed' || lastRun.failed_stage !== 2) return null;

  const stage1Rows = await supabase.select(
    'distribution_transactions',
    `?run_id=eq.${lastRun.id}&stage=eq.1&select=role,amount_lamports,tx_signature`
  );
  const community = stage1Rows.find((r) => r.role === 'community');
  const dev = stage1Rows.find((r) => r.role === 'dev');
  const ocean = stage1Rows.find((r) => r.role === 'ocean');
  if (!community || !dev || !ocean) {
    // Incomplete Stage 1 records for some reason — don't guess, fall through
    // to the normal fresh-run flow instead of resuming blind.
    return null;
  }

  return {
    runId: lastRun.id,
    totalLamports: lastRun.total_lamports,
    stage1: {
      split: { community: community.amount_lamports, dev: dev.amount_lamports, ocean: ocean.amount_lamports },
      batches: [...new Set(stage1Rows.map((r) => r.tx_signature))].map((signature) => ({ signature })),
      transactions: stage1Rows,
    },
  };
}

// Shared by both a fresh run (right after Stage 1 lands) and a resumed one
// (Stage 1 already landed in an earlier, failed attempt): runs Stage 2,
// marks the run completed or failed accordingly, and handles the recap/
// alert/marketing-post side effects either way.
async function runStage2AndFinish({ connection, communityKeypair, runId, totalLamports, stage1 }) {
  const stage2ReserveLamports = Number(process.env.STAGE2_RESERVE_LAMPORTS ?? 5_000_000);
  const communityLamports = Math.max(0, stage1.split.community - stage2ReserveLamports);

  try {
    const holderBalances = await solana.getHolderBalances(process.env.TOKEN_MINT, {
      // These already get their designated cut through the Stage 1/2 split
      // above — excluded here so they can't also collect a pro-rata share
      // of the holders' pool that's meant for the actual community.
      excludeWallets: [
        process.env.CREATOR_WALLET_PUBLIC,
        process.env.COMMUNITY_WALLET_PUBLIC,
        process.env.DEV_WALLET_PUBLIC,
        process.env.OCEAN_WALLET_PUBLIC,
        process.env.BAG_WALLET_PUBLIC,
        process.env.BUYBACK_RESERVE_WALLET_PUBLIC,
      ],
    });

    const stage2 = await runStage2({
      connection,
      communityKeypair,
      communityLamports,
      bagWallet: process.env.BAG_WALLET_PUBLIC,
      buybackWallet: process.env.BUYBACK_RESERVE_WALLET_PUBLIC,
      holderBalances,
      runId,
    });

    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: null,
      failed_stage: null,
    });

    const recap = formatRecap({ totalLamports, stage1, stage2 });
    await telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, recap, {
      threadId: telegram.getTopicId('fawkq-announcements'),
    });

    // Marketing post is best-effort and runs after the run is already marked
    // completed, so it can never roll back a successful distribution.
    await autoPostToX({ totalLamports, stage1, stage2 });
  } catch (err) {
    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: String(err?.message ?? err).slice(0, 2000),
      failed_stage: 2,
    });
    await alertFailure({ runId, stage: 2, err });
    throw err;
  }
}

async function main() {
  const connection = solana.getConnection();
  const communityKeypair = solana.keypairFromSecret(process.env.COMMUNITY_WALLET_SECRET);

  const resumable = await findResumableRun();
  if (resumable) {
    console.log(`Resuming distribution run #${resumable.runId} — Stage 1 already landed, retrying Stage 2 only.`);
    await runStage2AndFinish({ connection, communityKeypair, ...resumable });
    return;
  }

  if (!(await hasMinIntervalElapsed())) return;

  const creatorKeypair = solana.keypairFromSecret(process.env.CREATOR_WALLET_SECRET);
  const reserveLamports = Number(process.env.DISTRIBUTION_RESERVE_LAMPORTS ?? 5_000_000);
  const balance = await connection.getBalance(creatorKeypair.publicKey);
  const totalLamports = Math.max(0, balance - reserveLamports);

  if (totalLamports <= 0) {
    console.log('Nothing to distribute this cycle.');
    return;
  }

  const [run] = await supabase.insert('distribution_runs', [{ total_lamports: totalLamports, status: 'started' }]);
  const runId = run.id;

  let stage1;
  try {
    stage1 = await runStage1({
      connection,
      creatorKeypair,
      totalLamports,
      communityWallet: process.env.COMMUNITY_WALLET_PUBLIC,
      devWallet: process.env.DEV_WALLET_PUBLIC,
      oceanWallet: process.env.OCEAN_WALLET_PUBLIC,
      runId,
    });
  } catch (err) {
    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: String(err?.message ?? err).slice(0, 2000),
      failed_stage: 1,
    });
    await alertFailure({ runId, stage: 1, err });
    throw err;
  }

  await runStage2AndFinish({ connection, communityKeypair, runId, totalLamports, stage1 });
}

main().catch((err) => {
  console.error('distribution run failed', err);
  process.exit(1);
});
