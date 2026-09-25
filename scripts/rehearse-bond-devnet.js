import 'dotenv/config';

import path from 'node:path';

import * as multisig from '@sqds/multisig';
import {
  TOKEN_2022_PROGRAM_ID,
  burnChecked,
  createMint,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import { buildBondLifecycleFixture } from '../src/campaign/automatedRehearsal.js';
import { buildBondOnchainRehearsalPlan } from '../src/campaign/bondOnchainRehearsal.js';
import { loadOrCreateDevnetRehearsalPayer } from '../src/campaign/devnetRehearsalPayer.js';
import { assertBondDevnetGenesis } from '../src/campaign/devnetRehearsalPreflight.js';
import { validateBondRehearsalEnvironment } from '../src/campaign/rehearsalIsolation.js';
import { confirmSolanaSignature } from '../src/campaign/solanaConfirmation.js';
import { withSolanaRpcRetry } from '../src/campaign/solanaRpcRetry.js';

const { Permission, Permissions } = multisig.types;
const FULL_LEDGER = String(process.env.BOND_REHEARSAL_FULL_LEDGER || '').toLowerCase() === 'true';
const PAYER_FILE = path.resolve(process.env.BOND_REHEARSAL_PAYER_FILE || '.bond-devnet-payer.json');

async function confirm(connection, signature) {
  return confirmSolanaSignature(connection, signature);
}

async function ensureFunding(connection, payer) {
  const minimum = 2 * LAMPORTS_PER_SOL;
  let balance = await withSolanaRpcRetry(() => connection.getBalance(payer.publicKey, 'confirmed'));
  let lastError = null;
  for (let attempt = 0; balance < minimum && attempt < 8; attempt += 1) {
    try {
      const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL / 2);
      await confirm(connection, signature);
      balance = await withSolanaRpcRetry(() => connection.getBalance(payer.publicKey, 'confirmed'));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  if (balance < minimum) {
    throw new Error(
      `Devnet rehearsal payer ${payer.publicKey.toBase58()} has ${balance} lamports; `
      + `requires ${minimum}. Public faucet unavailable (${lastError?.message || 'insufficient balance'}). `
      + 'The same ignored test payer will be reused so funding can accumulate safely.',
    );
  }
}

async function sendInstructions(connection, payer, instructions) {
  const latest = await withSolanaRpcRetry(() => connection.getLatestBlockhash('confirmed'));
  const transaction = new VersionedTransaction(new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message());
  transaction.sign([payer]);
  const signature = await connection.sendTransaction(transaction, { maxRetries: 3 });
  return confirm(connection, signature);
}

async function executeSquadsInstructions({
  connection, payer, secondMember, multisigPda, vaultPda, instructions, memo,
}) {
  const multisigInfo = await withSolanaRpcRetry(
    () => multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda),
  );
  const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;
  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await withSolanaRpcRetry(() => connection.getLatestBlockhash('confirmed'))).blockhash,
    instructions,
  });
  await confirm(connection, await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer: payer,
    multisigPda,
    transactionIndex,
    creator: payer.publicKey,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage,
    memo,
  }));
  await confirm(connection, await multisig.rpc.proposalCreate({
    connection, feePayer: payer, multisigPda, transactionIndex, creator: payer,
  }));
  await confirm(connection, await multisig.rpc.proposalApprove({
    connection, feePayer: payer, multisigPda, transactionIndex, member: payer,
  }));
  await confirm(connection, await multisig.rpc.proposalApprove({
    connection, feePayer: payer, multisigPda, transactionIndex, member: secondMember,
  }));
  return confirm(connection, await multisig.rpc.vaultTransactionExecute({
    connection,
    feePayer: payer,
    multisigPda,
    transactionIndex,
    member: payer.publicKey,
    signers: [payer],
    sendOptions: { maxRetries: 3 },
  }));
}

async function main() {
  const isolation = validateBondRehearsalEnvironment(process.env);
  if (!isolation.ready || isolation.network !== 'devnet') {
    throw new Error(`isolated devnet configuration required: ${isolation.reasons.join('; ')}`);
  }
  const connection = new Connection(isolation.rpcUrl, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: false,
  });
  await assertBondDevnetGenesis(connection);
  const { payer, source: payerSource } = await loadOrCreateDevnetRehearsalPayer({
    encoded: process.env.BOND_REHEARSAL_PAYER_JSON,
    seed: process.env.BOND_REHEARSAL_PAYER_SEED,
    file: PAYER_FILE,
    requireProtectedEnv: process.env.RENDER === 'true',
  });
  const secondMember = Keypair.generate();
  const thirdMember = Keypair.generate();
  const createKey = Keypair.generate();
  const burnAuthority = payer;
  const topContributor = Keypair.generate();
  const conservation = Keypair.generate();
  await ensureFunding(connection, payer);

  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });
  const programConfigPda = multisig.getProgramConfigPda({})[0];
  const programConfig = await withSolanaRpcRetry(
    () => multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda),
  );
  await confirm(connection, await multisig.rpc.multisigCreateV2({
    connection,
    treasury: programConfig.treasury,
    createKey,
    creator: payer,
    multisigPda,
    configAuthority: null,
    threshold: 2,
    members: [payer, secondMember, thirdMember].map(({ publicKey }) => ({
      key: publicKey,
      permissions: Permissions.fromPermissions([Permission.Initiate, Permission.Vote, Permission.Execute]),
    })),
    timeLock: 0,
    rentCollector: null,
    memo: 'Bond the Duck isolated rehearsal 2-of-3',
  }));
  const createdMultisig = await withSolanaRpcRetry(
    () => multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda),
  );

  await sendInstructions(connection, payer, [SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: vaultPda,
    lamports: 1_200_000_000,
  })]);
  const mint = await createMint(
    connection, payer, payer.publicKey, null, 6, undefined, undefined, TOKEN_2022_PROGRAM_ID,
  );
  const vaultToken = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, vaultPda, true, undefined, undefined,
    TOKEN_2022_PROGRAM_ID,
  );
  const burnToken = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, burnAuthority.publicKey, false, undefined, undefined,
    TOKEN_2022_PROGRAM_ID,
  );
  await mintToChecked(
    connection, payer, mint, vaultToken.address, payer,
    17_500_000_000_000n, 6, [], undefined, TOKEN_2022_PROGRAM_ID,
  );
  await mintToChecked(
    connection, payer, mint, burnToken.address, payer,
    15_000_000_000_000n, 6, [], undefined, TOKEN_2022_PROGRAM_ID,
  );

  const { lifecycle } = buildBondLifecycleFixture();
  const telegramIds = [...new Set(lifecycle.cycles.flatMap(({ selection }) =>
    selection.winners.map(({ telegramUserId }) => telegramUserId)))];
  const recipients = new Map(telegramIds.map((id) => [id, Keypair.generate()]));
  for (const recipient of recipients.values()) {
    await getOrCreateAssociatedTokenAccount(
      connection, payer, mint, recipient.publicKey, false, undefined, undefined,
      TOKEN_2022_PROGRAM_ID,
    );
  }
  const plan = buildBondOnchainRehearsalPlan({
    mint: mint.toBase58(),
    squadsVaultAuthority: vaultPda.toBase58(),
    burnAuthority: burnAuthority.publicKey.toBase58(),
    topContributorWallet: topContributor.publicKey.toBase58(),
    conservationWallet: conservation.publicKey.toBase58(),
    recipientWalletByTelegramId: new Map([...recipients].map(([id, keypair]) => [id, keypair.publicKey.toBase58()])),
  });

  const transferBatches = FULL_LEDGER ? plan.transferBatches : plan.transferBatches.slice(0, 1);
  const transferSignatures = [];
  for (let index = 0; index < transferBatches.length; index += 1) {
    transferSignatures.push(await executeSquadsInstructions({
      connection,
      payer,
      secondMember,
      multisigPda,
      vaultPda,
      instructions: transferBatches[index].map(({ instruction }) => instruction),
      memo: `Bond release rehearsal batch ${index + 1}/${transferBatches.length}`,
    }));
  }
  const impactSignature = await executeSquadsInstructions({
    connection,
    payer,
    secondMember,
    multisigPda,
    vaultPda,
    instructions: plan.impactRows.map(({ instruction }) => instruction),
    memo: 'Bond separate winner and conservation impact rehearsal',
  });
  const burnSignatures = [];
  for (const row of plan.burnRows) {
    burnSignatures.push(await burnChecked(
      connection, payer, burnToken.address, mint, burnAuthority,
      BigInt(row.amountBaseUnits), 6, [], undefined, TOKEN_2022_PROGRAM_ID,
    ));
  }

  const vaultAfter = await getAccount(connection, vaultToken.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const burnAfter = await getAccount(connection, burnToken.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const mintAfter = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const expectedTransfer = transferBatches.flat().reduce((sum, row) => sum + BigInt(row.amountBaseUnits), 0n);
  const expectedVault = 17_500_000_000_000n - expectedTransfer;
  const gates = {
    isolatedDevnet: isolation.ready && isolation.productionAssetsAllowed === false,
    token2022Mint: mintAfter.tlvData != null,
    squadsThreshold2Of3: createdMultisig.threshold === 2 && createdMultisig.members.length === 3,
    planned175Transfers: plan.manifest.transferCount === 175,
    planned15mRewards: plan.manifest.transferTotalBaseUnits === '15000000000000',
    executedFullRewardLedger: FULL_LEDGER && transferBatches.length === plan.transferBatches.length,
    vaultBalanceReconciled: vaultAfter.amount === expectedVault,
    burn15mExecuted: burnAfter.amount === 0n,
    supplyBurnReconciled: mintAfter.supply === 17_500_000_000_000n,
    impactPaymentsSeparated: await withSolanaRpcRetry(() => connection.getBalance(topContributor.publicKey)) === 1_000_000_000
      && await withSolanaRpcRetry(() => connection.getBalance(conservation.publicKey)) === 100_000_000,
  };
  const passed = Object.entries(gates)
    .filter(([key]) => key !== 'executedFullRewardLedger')
    .every(([, value]) => value)
    && (!FULL_LEDGER || gates.executedFullRewardLedger);
  console.log(JSON.stringify({
    schema: 'bond-devnet-rehearsal-v1',
    completedAt: new Date().toISOString(),
    mode: FULL_LEDGER ? 'FULL_175_RELEASE_LEDGER' : 'REPRESENTATIVE_SQUADS_BATCH',
    passed,
    gates,
    manifest: plan.manifest,
    evidence: {
      payer: payer.publicKey.toBase58(),
      payerSource,
      multisig: multisigPda.toBase58(),
      vault: vaultPda.toBase58(),
      mint: mint.toBase58(),
      transferSignatures,
      impactSignature,
      burnSignatures,
    },
    productionAssetsTouched: false,
  }, null, 2));
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Bond Devnet rehearsal failed:', error.message);
  process.exitCode = 1;
});
