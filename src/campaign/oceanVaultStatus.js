import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
  unpackMint,
} from '@solana/spl-token';
import { FAWKQ_MINT } from './walletStatus.js';

export const OCEAN_VAULT = 'J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p';
export const OCEAN_SQUADS_MULTISIG = 'F2QFXHz75iL1MpuzsATMxhQ9MSf4aSbe8i66PsyQ8zeS';
export const NATIVE_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

const vault = new PublicKey(OCEAN_VAULT);
const definitions = [
  { symbol: 'USDC', mint: new PublicKey(NATIVE_USDC_MINT), program: TOKEN_PROGRAM_ID, decimals: 6 },
  { symbol: 'FAWKQ', mint: new PublicKey(FAWKQ_MINT), program: TOKEN_2022_PROGRAM_ID, decimals: 6 },
].map((definition) => ({
  ...definition,
  account: getAssociatedTokenAddressSync(definition.mint, vault, true, definition.program),
}));

export function oceanVaultTokenAccounts() {
  return Object.fromEntries(definitions.map(({ symbol, account }) => [symbol, account.toBase58()]));
}

export async function getOceanVaultStatus(connection, now = new Date()) {
  if (await connection.getGenesisHash() !== MAINNET_GENESIS) {
    throw new Error('ocean vault observation requires Solana mainnet');
  }
  const response = await connection.getMultipleAccountsInfoAndContext(
    [vault, ...definitions.map(({ mint }) => mint), ...definitions.map(({ account }) => account)],
    'finalized'
  );
  const accounts = response?.value;
  if (!Array.isArray(accounts) || accounts.length !== 5 || !Number.isSafeInteger(response.context?.slot)) {
    throw new Error('ocean vault chain observation unavailable');
  }
  const [vaultInfo, ...remaining] = accounts;
  if (!vaultInfo || !vaultInfo.owner?.equals(SystemProgram.programId)
    || vaultInfo.executable || PublicKey.isOnCurve(vault.toBytes())
    || !Number.isSafeInteger(vaultInfo.lamports) || vaultInfo.lamports < 0) {
    throw new Error('ocean vault account did not pass recipient checks');
  }

  const assets = {};
  for (const [index, definition] of definitions.entries()) {
    const { symbol, mint, program, account, decimals } = definition;
    const mintInfo = unpackMint(mint, remaining[index], program);
    if (!mintInfo.isInitialized || mintInfo.decimals !== decimals) {
      throw new Error(`${symbol} mint did not pass validation`);
    }
    const tokenInfo = remaining[definitions.length + index];
    if (!tokenInfo) {
      assets[symbol] = { available: false, mint: mint.toBase58(), tokenProgramId: program.toBase58(),
        tokenAccount: null, balanceBaseUnits: null, decimals };
      continue;
    }
    const parsed = unpackAccount(account, tokenInfo, program);
    if (!parsed.mint.equals(mint) || !parsed.owner.equals(vault) || !parsed.isInitialized || parsed.isFrozen || parsed.isNative) {
      throw new Error(`${symbol} receiving account did not pass validation`);
    }
    assets[symbol] = { available: true, mint: mint.toBase58(), tokenProgramId: program.toBase58(),
      tokenAccount: account.toBase58(), balanceBaseUnits: parsed.amount.toString(), decimals };
  }
  return {
    available: true,
    network: 'mainnet-beta',
    vault: OCEAN_VAULT,
    multisig: OCEAN_SQUADS_MULTISIG,
    slot: response.context.slot,
    observedAt: now.toISOString(),
    sol: { balanceLamports: String(vaultInfo.lamports) },
    assets,
  };
}
