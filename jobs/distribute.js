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

async function main() {
  if (!(await hasMinIntervalElapsed())) return;
  const connection = solana.getConnection();
  const creatorKeypair = solana.keypairFromSecret(process.env.CREATOR_WALLET_SECRET);
  const communityKeypair = solana.keypairFromSecret(process.env.COMMUNITY_WALLET_SECRET);

  const reserveLamports = Number(process.env.DISTRIBUTION_RESERVE_LAMPORTS ?? 5_000_000);
  // Mirrors the creator-wallet reserve above: Stage 2 pays its own network
  // fees out of what it just received from Stage 1, so it can't redistribute
  // 100% of that amount without eventually running dry on fees.
  const stage2ReserveLamports = Number(process.env.STAGE2_RESERVE_LAMPORTS ?? 5_000_000);
  const balance = await connection.getBalance(creatorKeypair.publicKey);
  const totalLamports = Math.max(0, balance - reserveLamports);

  if (totalLamports <= 0) {
    console.log('Nothing to distribute this cycle.');
    return;
  }

  const [run] = await supabase.insert('distribution_runs', [{ total_lamports: totalLamports, status: 'started' }]);
  const runId = run.id;
  let currentStage = null;

  try {
    currentStage = 1;
    const stage1 = await runStage1({
      connection,
      creatorKeypair,
      totalLamports,
      communityWallet: process.env.COMMUNITY_WALLET_PUBLIC,
      devWallet: process.env.DEV_WALLET_PUBLIC,
      oceanWallet: process.env.OCEAN_WALLET_PUBLIC,
      runId,
    });

    const holderBalances = await solana.getHolderBalances(process.env.TOKEN_MINT);

    currentStage = 2;
    const communityLamports = Math.max(0, stage1.split.community - stage2ReserveLamports);
    const stage2 = await runStage2({
      connection,
      communityKeypair,
      communityLamports,
      bagWallet: process.env.BAG_WALLET_PUBLIC,
      buybackWallet: process.env.BUYBACK_RESERVE_WALLET_PUBLIC,
      holderBalances,
      runId,
    });
    currentStage = null;

    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
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
      failed_stage: currentStage,
    });
    await alertFailure({ runId, stage: currentStage, err });
    throw err;
  }
}

main().catch((err) => {
  console.error('distribution run failed', err);
  process.exit(1);
});
