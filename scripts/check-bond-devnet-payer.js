import 'dotenv/config';

import { Connection } from '@solana/web3.js';

import { inspectBondDevnetPayer } from '../src/campaign/devnetRehearsalPreflight.js';
import { validateBondRehearsalEnvironment } from '../src/campaign/rehearsalIsolation.js';

try {
  const isolation = validateBondRehearsalEnvironment(process.env);
  if (!isolation.ready || isolation.network !== 'devnet') {
    throw new Error(`isolated devnet configuration required: ${isolation.reasons.join('; ')}`);
  }
  const connection = new Connection(isolation.rpcUrl, { commitment: 'confirmed' });
  const result = await inspectBondDevnetPayer(connection);
  console.log(JSON.stringify(result, null, 2));
  if (!result.meetsScriptMinimum) process.exitCode = 2;
} catch (error) {
  console.error('Bond Devnet payer preflight failed:', error.message);
  process.exitCode = 1;
}
