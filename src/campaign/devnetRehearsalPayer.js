import { chmod, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { Keypair } from '@solana/web3.js';

function decodeKeypair(bytes, label) {
  if (!Array.isArray(bytes) || bytes.length !== 64 || bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error(`${label} must be a protected 64-byte keypair array`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

function deriveKeypair(seed) {
  const normalized = String(seed).trim();
  if (normalized.length < 32) {
    throw new Error('BOND_REHEARSAL_PAYER_SEED must contain at least 32 characters of protected entropy');
  }
  return Keypair.fromSeed(createHash('sha256').update(normalized, 'utf8').digest());
}

export async function loadOrCreateDevnetRehearsalPayer({ encoded = '', seed = '', file, requireProtectedEnv = false }) {
  if (String(encoded).trim()) {
    return { payer: decodeKeypair(JSON.parse(encoded), 'BOND_REHEARSAL_PAYER_JSON'), source: 'PROTECTED_ENV' };
  }
  if (String(seed).trim()) {
    return { payer: deriveKeypair(seed), source: 'PROTECTED_ENV_SEED' };
  }
  if (requireProtectedEnv) {
    throw new Error('Cloud Devnet rehearsal requires BOND_REHEARSAL_PAYER_SEED or BOND_REHEARSAL_PAYER_JSON in protected persistent environment configuration; refusing to create an ephemeral payer');
  }
  try {
    const payer = decodeKeypair(JSON.parse(await readFile(file, 'utf8')), 'rehearsal payer file');
    return { payer, source: 'IGNORED_LOCAL_FILE' };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error(`invalid rehearsal payer file: ${error.message}`);
    const payer = Keypair.generate();
    await writeFile(file, `${JSON.stringify([...payer.secretKey])}\n`, { mode: 0o600, flag: 'wx' });
    await chmod(file, 0o600);
    return { payer, source: 'NEW_IGNORED_LOCAL_FILE' };
  }
}
