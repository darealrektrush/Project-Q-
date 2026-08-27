import { PublicKey } from '@solana/web3.js';

export const FAWKQ_MINT = 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const FAWKQ_DECIMALS = 6;
export const SOLANA_NETWORK = 'mainnet-beta';

const BASE_UNITS = /^\d+$/;

export function closedFawkqWalletStatus() {
  return {
    available: false,
    network: SOLANA_NETWORK,
    mint: FAWKQ_MINT,
    tokenProgramId: TOKEN_2022_PROGRAM_ID,
    decimals: FAWKQ_DECIMALS,
    balanceBaseUnits: null,
    tokenAccountCount: 0,
    observedAt: null,
  };
}

export async function getFawkqWalletStatus(connection, wallet, { now = new Date() } = {}) {
  let owner;
  try {
    owner = new PublicKey(wallet);
  } catch {
    throw new Error('invalid reward wallet');
  }
  if (!PublicKey.isOnCurve(owner.toBytes())) throw new Error('invalid reward wallet');

  const response = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) },
    'confirmed'
  );

  let balance = 0n;
  let tokenAccountCount = 0;
  for (const account of response?.value ?? []) {
    const info = account?.account?.data?.parsed?.info;
    if (!info || info.mint !== FAWKQ_MINT || info.owner !== owner.toBase58()) continue;
    const amount = String(info.tokenAmount?.amount ?? '');
    if (!BASE_UNITS.test(amount)) throw new Error('invalid token balance');
    balance += BigInt(amount);
    tokenAccountCount += 1;
  }

  return {
    available: true,
    network: SOLANA_NETWORK,
    mint: FAWKQ_MINT,
    tokenProgramId: TOKEN_2022_PROGRAM_ID,
    decimals: FAWKQ_DECIMALS,
    balanceBaseUnits: balance.toString(),
    tokenAccountCount,
    observedAt: now.toISOString(),
  };
}
