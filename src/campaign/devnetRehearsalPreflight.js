import { loadOrCreateDevnetRehearsalPayer } from './devnetRehearsalPayer.js';
import { validateBondRehearsalEnvironment } from './rehearsalIsolation.js';
import { withSolanaRpcRetry } from './solanaRpcRetry.js';

export const BOND_DEVNET_MINIMUM_LAMPORTS = 2_000_000_000;
export const BOND_DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

export async function assertBondDevnetGenesis(connection) {
  const genesisHash = await withSolanaRpcRetry(() => connection.getGenesisHash());
  if (genesisHash !== BOND_DEVNET_GENESIS_HASH) {
    throw new Error('RPC does not identify the expected Solana Devnet genesis hash');
  }
}

// Read-only: never generates a payer or submits an airdrop or transaction.
export async function inspectBondDevnetPayer(connection, env = process.env) {
  const isolation = validateBondRehearsalEnvironment(env);
  if (!isolation.ready || isolation.network !== 'devnet') {
    throw new Error(`isolated devnet configuration required: ${isolation.reasons.join('; ')}`);
  }
  const { payer, source } = await loadOrCreateDevnetRehearsalPayer({
    encoded: env.BOND_REHEARSAL_PAYER_JSON,
    seed: env.BOND_REHEARSAL_PAYER_SEED,
    requireProtectedEnv: true,
  });
  await assertBondDevnetGenesis(connection);
  const balanceLamports = await withSolanaRpcRetry(
    () => connection.getBalance(payer.publicKey, 'confirmed'),
  );
  return {
    network: 'devnet',
    payerAddress: payer.publicKey.toBase58(),
    payerSource: source,
    balanceLamports,
    minimumLamports: BOND_DEVNET_MINIMUM_LAMPORTS,
    meetsScriptMinimum: balanceLamports >= BOND_DEVNET_MINIMUM_LAMPORTS,
    mutationsPerformed: false,
  };
}
