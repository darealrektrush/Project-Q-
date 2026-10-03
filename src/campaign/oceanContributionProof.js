import bs58 from 'bs58';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { FAWKQ_MINT } from './walletStatus.js';
import { NATIVE_USDC_MINT, OCEAN_VAULT, oceanVaultTokenAccounts } from './oceanVaultStatus.js';

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const destinations = oceanVaultTokenAccounts();
const tokenAssets = [
  { symbol: 'USDC', mint: NATIVE_USDC_MINT, program: TOKEN_PROGRAM_ID.toBase58(), destination: destinations.USDC },
  { symbol: 'FAWKQ', mint: FAWKQ_MINT, program: TOKEN_2022_PROGRAM_ID.toBase58(), destination: destinations.FAWKQ },
];

function validSignature(value) {
  if (typeof value !== 'string' || value.length < 80 || value.length > 90) return false;
  try { return bs58.decode(value).length === 64; } catch { return false; }
}

function key(value) { return typeof value === 'string' ? value : value?.toBase58?.() || value?.pubkey?.toBase58?.() || value?.pubkey?.toString?.(); }
function positiveUnits(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value);
  return /^(?:[1-9][0-9]*)$/.test(normalized) ? BigInt(normalized) : null;
}

export function inspectOceanContribution(transaction, signature, wallet) {
  if (!transaction || transaction.meta?.err !== null || !transaction.meta || !Number.isSafeInteger(transaction.slot)
    || transaction.transaction?.signatures?.[0] !== signature) return null;
  const message = transaction.transaction.message;
  const accountKeys = message?.accountKeys?.map(key);
  if (!accountKeys?.includes(wallet) || !message.accountKeys.some((entry) => key(entry) === wallet && entry.signer === true)) return null;
  const instructions = [
    ...(message.instructions || []),
    ...(transaction.meta.innerInstructions || []).flatMap((group) => group.instructions || []),
  ];
  const sourceTokens = new Set((transaction.meta.preTokenBalances || [])
    .filter((balance) => balance.owner === wallet && Number.isSafeInteger(balance.accountIndex))
    .map((balance) => accountKeys[balance.accountIndex]));
  const results = new Map();
  for (const instruction of instructions) {
    const { programId, parsed } = instruction;
    const info = parsed?.info;
    if (!info || !['transfer', 'transferChecked'].includes(parsed.type)) continue;
    let asset;
    let units;
    if (key(programId) === SystemProgram.programId.toBase58()
      && parsed.type === 'transfer' && info.source === wallet && info.destination === OCEAN_VAULT) {
      asset = 'SOL';
      units = positiveUnits(info.lamports);
    } else {
      const definition = tokenAssets.find(({ program, destination }) =>
        key(programId) === program && info.destination === destination && sourceTokens.has(info.source));
      if (!definition) continue;
      const sourceIndex = accountKeys.indexOf(info.source);
      const sourceBalance = (transaction.meta.preTokenBalances || []).find((balance) =>
        balance.accountIndex === sourceIndex && balance.owner === wallet && balance.mint === definition.mint);
      if (!sourceBalance || (parsed.type === 'transferChecked' && info.mint !== definition.mint)) continue;
      if (parsed.type === 'transferChecked' && info.tokenAmount?.decimals !== 6) continue;
      asset = definition.symbol;
      units = positiveUnits(parsed.type === 'transferChecked' ? info.tokenAmount?.amount : info.amount);
    }
    if (units !== null) results.set(asset, (results.get(asset) || 0n) + units);
  }
  if (!results.size) return null;
  return {
    signature, vault: OCEAN_VAULT, wallet, slot: transaction.slot,
    blockTime: Number.isSafeInteger(transaction.blockTime) ? transaction.blockTime : null,
    transfers: [...results].map(([asset, amountBaseUnits]) => ({ asset, amountBaseUnits: amountBaseUnits.toString(), decimals: asset === 'SOL' ? 9 : 6 })),
  };
}

export async function verifyOceanContribution(connection, signature, wallet) {
  if (!validSignature(signature)) throw new Error('invalid transaction signature');
  try { if (new PublicKey(wallet).toBase58() !== wallet) throw new Error(); }
  catch { throw new Error('invalid verified wallet'); }
  if (await connection.getGenesisHash() !== MAINNET_GENESIS) throw new Error('ocean contribution requires Solana mainnet');
  const transaction = await connection.getParsedTransaction(signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
  return inspectOceanContribution(transaction, signature, wallet);
}
