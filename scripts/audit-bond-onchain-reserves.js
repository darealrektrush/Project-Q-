// Public, read-only mainnet capacity snapshot. It cannot create a funding proposal
// or prove that either balance has been committed to the campaign.
import { createHash } from 'node:crypto';

import { Connection, PublicKey } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import {
  getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, unpackAccount, unpackMint,
} from '@solana/spl-token';

import { FAWKQ_MINT, FAWKQ_CREATOR_TOKEN_ACCOUNT } from '../src/earnToBurn/identity.js';

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const EXPECTED_VAULT_AUTHORITY = '3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci';
const MIN_VAULT = 17_500_000_000_000n;
const MIN_CREATOR = 15_000_000_000_000n;
const MIN_SOL_IMPACT_LAMPORTS = 1_100_000_000n;

async function main() {
  const multisigAddress = new PublicKey(process.env.BOND_SQUADS_MULTISIG_PUBLIC || '9xTq2tfgGWimdk3wEgZ6dQxnV98baEysotxwapsBDwUf');
  const connection = new Connection(
    process.env.BOND_MAINNET_READONLY_RPC_URL || 'https://api.mainnet-beta.solana.com',
    { commitment: 'finalized' },
  );
  if (await connection.getGenesisHash() !== MAINNET_GENESIS) throw new Error('RPC is not Solana mainnet');

  const [vaultAuthority] = multisig.getVaultPda({ multisigPda: multisigAddress, index: 0 });
  if (vaultAuthority.toBase58() !== EXPECTED_VAULT_AUTHORITY) throw new Error('unexpected Squads vault authority');
  const mintAddress = new PublicKey(FAWKQ_MINT);
  const vaultTokenAddress = getAssociatedTokenAddressSync(
    mintAddress, vaultAuthority, true, TOKEN_2022_PROGRAM_ID,
  );
  const creatorAddress = new PublicKey(FAWKQ_CREATOR_TOKEN_ACCOUNT);
  const keys = [multisigAddress, vaultAuthority, mintAddress, vaultTokenAddress, creatorAddress];
  const { context, value } = await connection.getMultipleAccountsInfoAndContext(keys, 'finalized');
  if (value.some((account) => !account)) throw new Error('one or more expected mainnet accounts are missing');
  if (!value[0].owner.equals(multisig.PROGRAM_ID)) throw new Error('multisig is owned by another program');
  if (!value[2].owner.equals(TOKEN_2022_PROGRAM_ID)) throw new Error('mint is not Token-2022');

  const [state] = multisig.accounts.Multisig.fromAccountInfo(value[0]);
  const mint = unpackMint(mintAddress, value[2], TOKEN_2022_PROGRAM_ID);
  const vault = unpackAccount(vaultTokenAddress, value[3], TOKEN_2022_PROGRAM_ID);
  const creator = unpackAccount(creatorAddress, value[4], TOKEN_2022_PROGRAM_ID);
  const creatorOwner = new PublicKey('7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT');
  if (state.threshold !== 2 || state.members.length !== 3) throw new Error('Squads authority is not 2-of-3');
  if (mint.decimals !== 6 || !vault.mint.equals(mintAddress) || !creator.mint.equals(mintAddress)) {
    throw new Error('FAWKQ mint or decimals mismatch');
  }
  if (!vault.owner.equals(vaultAuthority) || !creator.owner.equals(creatorOwner)) {
    throw new Error('token account owner mismatch');
  }
  if (vault.delegate || creator.delegate || !vault.isInitialized || !creator.isInitialized) {
    throw new Error('token account is delegated or uninitialized');
  }

  const snapshot = {
    schema: 'bond-readonly-onchain-reserves-v1', network: 'mainnet-beta',
    commitment: 'finalized', slot: context.slot, mint: mintAddress.toBase58(), decimals: mint.decimals,
    tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(), multisig: multisigAddress.toBase58(),
    vaultAuthority: vaultAuthority.toBase58(), vaultTokenAccount: vaultTokenAddress.toBase58(),
    threshold: state.threshold, memberCount: state.members.length,
    vaultBalanceBaseUnits: vault.amount.toString(), vaultCapacityAtLeast17500000: vault.amount >= MIN_VAULT,
    vaultSolLamports: String(value[1].lamports),
    vaultSolCapacityAtLeast1Point1: BigInt(value[1].lamports) >= MIN_SOL_IMPACT_LAMPORTS,
    creatorTokenAccount: creatorAddress.toBase58(), creatorBalanceBaseUnits: creator.amount.toString(),
    creatorCapacityAtLeast15000000: creator.amount >= MIN_CREATOR,
    campaignFundingCommitmentVerified: false, creatorBurnApprovalVerified: false,
    solImpactCommitmentVerified: false,
  };
  console.log(JSON.stringify({
    ...snapshot,
    snapshotSha256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
  }, null, 2));
  if (!snapshot.vaultCapacityAtLeast17500000 || !snapshot.creatorCapacityAtLeast15000000) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Bond on-chain reserves audit failed:', error.message);
  process.exitCode = 1;
});
