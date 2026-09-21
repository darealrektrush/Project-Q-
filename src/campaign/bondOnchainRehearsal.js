import { createHash } from 'node:crypto';

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { BOND_REHEARSAL_TOTALS, buildBondLifecycleFixture } from './automatedRehearsal.js';

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function publicKey(value, label) {
  const text = String(value || '').trim();
  if (!BASE58_ADDRESS.test(text)) throw new Error(`${label} must be a Solana address`);
  return new PublicKey(text);
}

function instructionFingerprint(instruction) {
  return createHash('sha256').update(JSON.stringify({
    programId: instruction.programId.toBase58(),
    keys: instruction.keys.map(({ pubkey, isSigner, isWritable }) => ({
      pubkey: pubkey.toBase58(), isSigner, isWritable,
    })),
    data: Buffer.from(instruction.data).toString('base64'),
  })).digest('hex');
}

function batches(rows, size) {
  if (!Number.isSafeInteger(size) || size < 1 || size > 8) {
    throw new Error('instruction batch size must be from 1 through 8');
  }
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

export function buildBondOnchainRehearsalPlan({
  mint,
  squadsVaultAuthority,
  burnAuthority,
  topContributorWallet,
  conservationWallet,
  recipientWalletByTelegramId,
  decimals = 6,
  transferBatchSize = 6,
} = {}) {
  if (!Number.isSafeInteger(decimals) || decimals !== 6) throw new Error('Bond rehearsal mint must use six decimals');
  if (!(recipientWalletByTelegramId instanceof Map)) throw new Error('recipient wallet map is required');

  const mintKey = publicKey(mint, 'rehearsal mint');
  const vaultAuthority = publicKey(squadsVaultAuthority, 'Squads vault authority');
  const burnOwner = publicKey(burnAuthority, 'burn authority');
  const topWallet = publicKey(topContributorWallet, 'top contributor wallet');
  const oceanWallet = publicKey(conservationWallet, 'conservation wallet');
  const vaultTokenAccount = getAssociatedTokenAddressSync(
    mintKey, vaultAuthority, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const burnTokenAccount = getAssociatedTokenAddressSync(
    mintKey, burnOwner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const { lifecycle } = buildBondLifecycleFixture();
  const releases = lifecycle.cycles.flatMap(({ releasePlans, selection }) =>
    releasePlans.flatMap((plan) => {
      const position = Number(plan.allocationKey.split(':position-')[1]);
      const winner = selection.winners.find((row) => row.position === position);
      return plan.releases.map((release) => ({ ...release, telegramUserId: winner.telegramUserId }));
    }));

  const transferRows = releases.map((release) => {
    const recipient = publicKey(
      recipientWalletByTelegramId.get(release.telegramUserId),
      `recipient wallet for ${release.telegramUserId}`,
    );
    const destination = getAssociatedTokenAddressSync(
      mintKey, recipient, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const instruction = createTransferCheckedInstruction(
      vaultTokenAccount, mintKey, destination, vaultAuthority,
      BigInt(release.amountBaseUnits), decimals, [], TOKEN_2022_PROGRAM_ID,
    );
    return {
      paymentKey: release.paymentKey,
      telegramUserId: release.telegramUserId,
      amountBaseUnits: release.amountBaseUnits,
      recipient: recipient.toBase58(),
      destinationTokenAccount: destination.toBase58(),
      instruction,
      fingerprint: instructionFingerprint(instruction),
    };
  });
  const burnRows = [2_000, 5_000, 9_000, 14_000, 20_000].map((progressTargetUnits, index) => {
    const instruction = createBurnCheckedInstruction(
      burnTokenAccount, mintKey, burnOwner, 3_000_000_000_000n,
      decimals, [], TOKEN_2022_PROGRAM_ID,
    );
    return {
      sequence: index + 1,
      progressTargetUnits: String(progressTargetUnits),
      amountBaseUnits: '3000000000000',
      instruction,
      fingerprint: instructionFingerprint(instruction),
    };
  });
  const impactRows = [
    { purpose: 'TOP_CONTRIBUTOR_PRIZE', wallet: topWallet, lamports: 1_000_000_000 },
    { purpose: 'OCEAN_CONSERVATION_IMPACT', wallet: oceanWallet, lamports: 100_000_000 },
  ].map((row) => {
    const instruction = SystemProgram.transfer({
      fromPubkey: vaultAuthority,
      toPubkey: row.wallet,
      lamports: row.lamports,
    });
    return { ...row, wallet: row.wallet.toBase58(), instruction, fingerprint: instructionFingerprint(instruction) };
  });
  const transferTotal = transferRows.reduce((sum, row) => sum + BigInt(row.amountBaseUnits), 0n);
  const burnTotal = burnRows.reduce((sum, row) => sum + BigInt(row.amountBaseUnits), 0n);
  const transferFingerprints = transferRows.map(({ fingerprint }) => fingerprint);

  if (transferRows.length !== 175 || new Set(transferRows.map(({ paymentKey }) => paymentKey)).size !== 175) {
    throw new Error('on-chain rehearsal must contain 175 unique release transfers');
  }
  if (transferTotal.toString() !== BOND_REHEARSAL_TOTALS.campaignRewardBaseUnits) {
    throw new Error('on-chain release transfers do not reconcile to 15M FAWKQ');
  }
  if (burnTotal.toString() !== BOND_REHEARSAL_TOTALS.earnToBurnBaseUnits) {
    throw new Error('on-chain burns do not reconcile to 15M FAWKQ');
  }
  if (transferRows.some(({ instruction }) => !instruction.programId.equals(TOKEN_2022_PROGRAM_ID))
    || burnRows.some(({ instruction }) => !instruction.programId.equals(TOKEN_2022_PROGRAM_ID))) {
    throw new Error('all token instructions must use Token-2022');
  }

  const manifest = {
    schema: 'bond-onchain-rehearsal-plan-v1',
    network: 'TEST_ONLY_DEVNET_OR_LOCALNET',
    tokenProgramId: TOKEN_2022_PROGRAM_ID.toBase58(),
    mint: mintKey.toBase58(),
    squadsVaultAuthority: vaultAuthority.toBase58(),
    vaultTokenAccount: vaultTokenAccount.toBase58(),
    burnAuthority: burnOwner.toBase58(),
    burnTokenAccount: burnTokenAccount.toBase58(),
    transferCount: transferRows.length,
    transferBatchCount: batches(transferRows, transferBatchSize).length,
    transferTotalBaseUnits: transferTotal.toString(),
    burnCount: burnRows.length,
    burnTotalBaseUnits: burnTotal.toString(),
    impactTransferCount: impactRows.length,
    impactTotalLamports: String(impactRows.reduce((sum, row) => sum + row.lamports, 0)),
    diamondDuckReservedBaseUnits: BOND_REHEARSAL_TOTALS.diamondDuckBaseUnits,
    transferFingerprints,
    burnFingerprints: burnRows.map(({ fingerprint }) => fingerprint),
    impactFingerprints: impactRows.map(({ fingerprint }) => fingerprint),
    mutationsPerformed: false,
  };
  return {
    manifest: {
      ...manifest,
      manifestFingerprint: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    },
    transferBatches: batches(transferRows, transferBatchSize),
    burnRows,
    impactRows,
  };
}
