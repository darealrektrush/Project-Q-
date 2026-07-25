// Looks for real recent on-chain token-transfer activity to power the
// "signal_detected" flavor of /signal with genuine data instead of only
// canned text. Read-only — never signs or sends anything.

const TREASURY_ENV_KEYS = [
  'CREATOR_WALLET_PUBLIC',
  'COMMUNITY_WALLET_PUBLIC',
  'DEV_WALLET_PUBLIC',
  'OCEAN_WALLET_PUBLIC',
  'BAG_WALLET_PUBLIC',
  'BUYBACK_RESERVE_WALLET_PUBLIC',
];

function getTreasuryWallets() {
  return new Set(TREASURY_ENV_KEYS.map((key) => process.env[key]).filter(Boolean));
}

async function getEnhancedTransactions(address, limit = 100) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is not set');

  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}`
  );
  if (!res.ok) {
    throw new Error(`Helius enhanced transactions failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Finds the largest outside (non-treasury) transfer of TOKEN_MINT within the
// lookback window that hasn't already been posted as a signal. Returns null
// if nothing notable turned up — callers should fall back to synthetic text.
export async function findNotableTransfer({ lookbackMs = 90 * 60 * 1000, alreadyPostedSignatures = [] } = {}) {
  const mint = process.env.TOKEN_MINT;
  if (!mint) return null;

  const treasury = getTreasuryWallets();
  const cutoff = Date.now() - lookbackMs;
  const posted = new Set(alreadyPostedSignatures);

  let transactions;
  try {
    transactions = await getEnhancedTransactions(mint, 100);
  } catch (err) {
    console.error('findNotableTransfer: Helius fetch failed', err);
    return null;
  }

  let best = null;
  for (const tx of transactions ?? []) {
    if (!tx?.timestamp || tx.timestamp * 1000 < cutoff) continue;
    if (posted.has(tx.signature)) continue;

    for (const transfer of tx.tokenTransfers ?? []) {
      if (transfer.mint !== mint) continue;
      if (treasury.has(transfer.fromUserAccount) || treasury.has(transfer.toUserAccount)) continue;

      const amount = Number(transfer.tokenAmount) || 0;
      if (amount <= 0) continue;

      if (!best || amount > best.amount) {
        best = {
          signature: tx.signature,
          wallet: transfer.toUserAccount || transfer.fromUserAccount,
          amount,
          timestamp: tx.timestamp,
        };
      }
    }
  }

  return best;
}

export function truncateWallet(address) {
  if (!address || address.length < 10) return address ?? 'unknown';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}
