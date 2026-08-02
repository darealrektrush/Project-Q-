// Devnet dry run of the REAL Stage 1 / Stage 2 distribution logic
// (src/lib/splitRewards.js, unmodified). Generates fresh throwaway wallets
// and a disposable SPL token each run — nothing here touches real wallets,
// the real TOKEN_MINT, or mainnet. Not wired into package.json on purpose;
// this is a manual dev tool, re-run it whenever you want to re-verify the
// distribution path.
//
// Holder balances are read directly off the 3 test wallets' token accounts
// via plain RPC instead of Helius DAS, since src/lib/solana.js's
// getHolderBalances() hardcodes the mainnet Helius endpoint regardless of
// HELIUS_RPC_URL — devnet indexing for a brand-new test mint isn't
// something to depend on anyway.
//
// Usage:
//   node --env-file=.env.local scripts/devnet-distribute-test.js
//   node --env-file=.env.local scripts/devnet-distribute-test.js --fail-stage2
import 'dotenv/config';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { runStage1, runStage2 } from '../src/lib/splitRewards.js';
import { supabase } from '../src/lib/supabase.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const FORCE_STAGE2_FAILURE = process.argv.includes('--fail-stage2');
const STAGE2_RESERVE_LAMPORTS = Number(process.env.STAGE2_RESERVE_LAMPORTS ?? 5_000_000);
const HOLDER_RATIOS = [500, 300, 200];

function sol(lamports) {
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
}

async function airdrop(connection, pubkey, sols) {
  const sig = await connection.requestAirdrop(pubkey, sols * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
}

function solscan(signature) {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

async function main() {
  console.log(
    FORCE_STAGE2_FAILURE
      ? '=== Devnet distribution test (FORCED Stage 2 failure) ===\n'
      : '=== Devnet distribution test (happy path) ===\n'
  );

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  const creator = Keypair.generate();
  const community = Keypair.generate();
  const dev = Keypair.generate();
  const ocean = Keypair.generate();
  const bag = Keypair.generate();
  const buyback = Keypair.generate();
  const holders = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const mintAuthority = Keypair.generate();

  console.log('Wallets (devnet, throwaway):');
  console.log('  creator  ', creator.publicKey.toBase58());
  console.log('  community', community.publicKey.toBase58());
  console.log('  dev      ', dev.publicKey.toBase58());
  console.log('  ocean    ', ocean.publicKey.toBase58());
  console.log('  bag      ', bag.publicKey.toBase58());
  console.log('  buyback  ', buyback.publicKey.toBase58());
  holders.forEach((h, i) => console.log(`  holder${i + 1}  `, h.publicKey.toBase58()));

  console.log('\nAirdropping devnet SOL (creator funds Stage 1 + community; mint authority funds token setup)...');
  await airdrop(connection, creator.publicKey, 2);
  await airdrop(connection, mintAuthority.publicKey, 1);

  console.log('Creating disposable devnet SPL mint and funding holder wallets (ratio 500/300/200)...');
  const mint = await createMint(connection, mintAuthority, mintAuthority.publicKey, null, 0);
  const holderBalances = [];
  for (let i = 0; i < holders.length; i++) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, mintAuthority, mint, holders[i].publicKey);
    await mintTo(connection, mintAuthority, mint, ata.address, mintAuthority, HOLDER_RATIOS[i]);
    holderBalances.push({ wallet: holders[i].publicKey.toBase58(), balance: HOLDER_RATIOS[i] });
  }
  console.log('  mint          ', mint.toBase58());
  console.log('  holder balances', holderBalances);

  const totalLamports = Math.round(1 * LAMPORTS_PER_SOL);

  const [run] = await supabase.insert('distribution_runs', [
    { total_lamports: totalLamports, status: 'started', network: 'devnet' },
  ]);
  const runId = run.id;
  console.log(`\ndistribution_runs id = ${runId} (network=devnet)`);

  let currentStage = null;
  try {
    currentStage = 1;
    const stage1 = await runStage1({
      connection,
      creatorKeypair: creator,
      totalLamports,
      communityWallet: community.publicKey.toBase58(),
      devWallet: dev.publicKey.toBase58(),
      oceanWallet: ocean.publicKey.toBase58(),
      runId,
    });
    console.log('\nStage 1 complete:', stage1.split);
    stage1.batches.forEach((b) => console.log('  tx:', solscan(b.signature)));

    currentStage = 2;
    const communityLamports = Math.max(0, stage1.split.community - STAGE2_RESERVE_LAMPORTS);
    const stage2 = await runStage2({
      connection,
      communityKeypair: community,
      communityLamports,
      bagWallet: FORCE_STAGE2_FAILURE ? 'not-a-real-pubkey' : bag.publicKey.toBase58(),
      buybackWallet: buyback.publicKey.toBase58(),
      holderBalances,
      runId,
    });
    currentStage = null;
    console.log('\nStage 2 complete:', stage2.split);
    console.log('  holder payouts:', stage2.holderPayouts);
    stage2.batches.forEach((b) => console.log('  tx:', solscan(b.signature)));

    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    const communityBalanceAfter = await connection.getBalance(community.publicKey);
    console.log(
      `\nCommunity wallet balance after Stage 2: ${sol(communityBalanceAfter)} ` +
        `(reserve target: ${sol(STAGE2_RESERVE_LAMPORTS)})`
    );
    console.log('\n=== SUCCESS ===');
  } catch (err) {
    console.error(`\n=== FAILED in Stage ${currentStage} ===`);
    console.error(err.message);

    await supabase.update('distribution_runs', `?id=eq.${runId}`, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: String(err?.message ?? err).slice(0, 2000),
      failed_stage: currentStage,
    });

    const rows = await supabase.select(
      'distribution_transactions',
      `?run_id=eq.${runId}&select=stage,role,to_wallet,amount_lamports,tx_signature&order=id`
    );
    console.log(`\ndistribution_transactions already recorded for run ${runId} despite the failure:`);
    console.table(rows);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('devnet test script crashed', err);
  process.exit(1);
});
