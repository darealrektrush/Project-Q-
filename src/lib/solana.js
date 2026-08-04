import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const MAX_TRANSFERS_PER_TX = 20;

export { LAMPORTS_PER_SOL };

export function getConnection() {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) throw new Error('HELIUS_RPC_URL is not set');
  return new Connection(rpcUrl, 'confirmed');
}

export function keypairFromSecret(secretBase58) {
  return Keypair.fromSecretKey(bs58.decode(secretBase58));
}

export async function getWalletBalanceLamports(connection, pubkey) {
  return connection.getBalance(new PublicKey(pubkey));
}

export function lamportsToSol(lamports) {
  return lamports / LAMPORTS_PER_SOL;
}

async function heliusRpc(method, params) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'project-q', method, params }),
  });
  const { result, error } = await res.json();
  if (error) throw new Error(`Helius ${method} failed: ${error.message}`);
  return result;
}

export async function getTokenPriceUsd(mint) {
  const result = await heliusRpc('getAsset', { id: mint, displayOptions: { showFungible: true } });
  return result?.token_info?.price_info?.price_per_token ?? null;
}

export async function getTokenSymbol(mint) {
  const asset = await heliusRpc('getAsset', { id: mint, displayOptions: { showFungible: true } });
  return asset?.token_info?.symbol ?? null;
}

// True for addresses a private key could actually control (on the ed25519
// curve) — false for program-derived addresses, which by construction have
// no corresponding keypair. Helius's getTokenAccounts reports the bonding
// curve reserve, AMM/vault accounts, etc. as "holders" exactly like real
// wallets; a SOL reward sent to one of those helps no one and generally
// can't be recovered. Confirmed live on FAWKQ's mint: 5 of 33 reported
// holders were off-curve, together ~79% of tracked supply — almost all of
// it the pump.fun bonding curve (5DmR2TCR...) plus a couple of matched-
// balance vault-looking accounts owned by the Token-2022 program.
export function isDistributableHolder(address) {
  try {
    return PublicKey.isOnCurve(new PublicKey(address).toBytes());
  } catch {
    return false;
  }
}

// Aggregates raw token balances by owner across all of their token accounts,
// excluding non-wallet (program-derived) owners — see isDistributableHolder
// — and any address in excludeWallets. Used both for holder counts and as
// pro-rata weights for Stage 2 payouts; callers doing the latter should
// pass the project's own operational wallets (creator, community, dev,
// ocean, bag, buyback) here. Those already get their designated cut
// through the Stage 1/2 percentage split — if one of them also happens to
// hold tokens, paying it again out of the holders' pool means real
// community holders split a smaller pool so the project can pay itself
// twice. Confirmed live: CREATOR_WALLET_PUBLIC held ~8% of FAWKQ's
// (post-bonding-curve-filter) distributable supply.
export async function getHolderBalances(mint, { excludeWallets = [] } = {}) {
  const excluded = new Set(excludeWallets.filter(Boolean));
  const balances = new Map();
  let cursor;

  do {
    const result = await heliusRpc('getTokenAccounts', { mint, limit: 1000, cursor });
    for (const account of result?.token_accounts ?? []) {
      const amount = Number(account.amount);
      if (amount <= 0) continue;
      if (excluded.has(account.owner)) continue;
      if (!isDistributableHolder(account.owner)) continue;
      balances.set(account.owner, (balances.get(account.owner) ?? 0) + amount);
    }
    cursor = result?.cursor;
  } while (cursor);

  return [...balances.entries()].map(([wallet, balance]) => ({ wallet, balance }));
}

export async function getHolderCount(mint) {
  const holders = await getHolderBalances(mint);
  return holders.length;
}

// Gets the decimals for a mint, so raw token amounts can be converted to a human-readable count.
export async function getMintDecimals(mint) {
  const asset = await heliusRpc('getAsset', { id: mint, displayOptions: { showFungible: true } });
  return asset?.token_info?.decimals ?? 0;
}

// Total supply and decimals for a mint in one call — for "X% of supply" math.
export async function getMintSupplyInfo(mint) {
  const asset = await heliusRpc('getAsset', { id: mint, displayOptions: { showFungible: true } });
  return {
    supply: Number(asset?.token_info?.supply ?? 0),
    decimals: asset?.token_info?.decimals ?? 0,
  };
}

// Sums raw token balance across all of a single owner's accounts for a given mint.
export async function getTokenBalanceForOwner(mint, owner) {
  const result = await heliusRpc('getTokenAccounts', { mint, owner, limit: 1000 });
  const accounts = result?.token_accounts ?? [];
  return accounts.reduce((sum, a) => sum + Number(a.amount), 0);
}

// Raw balance of one specific SPL token account address, rather than
// aggregating by owner — for holdings tracked by a fixed account (e.g. a
// token-lock/vesting escrow's underlying token account) rather than a
// wallet with a private key.
export async function getTokenAccountRawBalance(connection, tokenAccountAddress) {
  const { value } = await connection.getTokenAccountBalance(new PublicKey(tokenAccountAddress));
  return Number(value.amount);
}

// Builds, signs, and sends SOL transfers, batching into multiple transactions
// when there are more transfers than fit in one (e.g. holder payouts).
// Returns one entry per transaction sent, so callers can log which transfers
// landed in which signature.
export async function sendLamportTransfers({ connection, fromKeypair, transfers, chunkSize = MAX_TRANSFERS_PER_TX, onBatch }) {
  const batches = [];
  const validTransfers = transfers.filter((t) => t.lamports > 0);

  for (let i = 0; i < validTransfers.length; i += chunkSize) {
    const chunk = validTransfers.slice(i, i + chunkSize);
    const tx = new Transaction();
    for (const t of chunk) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: new PublicKey(t.to),
          lamports: t.lamports,
        })
      );
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromKeypair.publicKey;
    tx.sign(fromKeypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    const batch = { signature, transfers: chunk };
    batches.push(batch);
    // Persist each batch as it lands, so a later batch throwing doesn't lose
    // the record of transfers that already confirmed on-chain.
    if (onBatch) await onBatch(batch);
  }

  return batches;
}
