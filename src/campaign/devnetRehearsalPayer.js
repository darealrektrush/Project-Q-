import { chmod, readFile, writeFile } from 'node:fs/promises';

import { Keypair } from '@solana/web3.js';

function decodeKeypair(bytes, label) {
  if (!Array.isArray(bytes) || bytes.length !== 64 || bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error(`${label} must be a protected 64-byte keypair array`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export async function loadOrCreateDevnetRehearsalPayer({ encoded = '', file }) {
  if (String(encoded).trim()) {
    return { payer: decodeKeypair(JSON.parse(encoded), 'BOND_REHEARSAL_PAYER_JSON'), source: 'PROTECTED_ENV' };
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
