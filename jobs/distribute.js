import 'dotenv/config';
import * as solana from '../src/lib/solana.js';
import { runStage1, runStage2 } from '../src/lib/splitRewards.js';
import { supabase } from '../src/lib/supabase.js';
import * as telegram from '../src/lib/telegram.js';

const lamportsToSol = solana.lamportsToSol;

function solscanTxUrl(signature) {
  return `https://solscan.io/tx/${signature}`;
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
