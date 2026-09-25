import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { Keypair } from '@solana/web3.js';

import { loadOrCreateDevnetRehearsalPayer } from '../src/campaign/devnetRehearsalPayer.js';

test('Devnet rehearsal payer persists in a private ignored-style file', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bond-payer-'));
  const file = path.join(directory, 'payer.json');
  try {
    const created = await loadOrCreateDevnetRehearsalPayer({ file });
    const loaded = await loadOrCreateDevnetRehearsalPayer({ file });
    assert.equal(created.source, 'NEW_IGNORED_LOCAL_FILE');
    assert.equal(loaded.source, 'IGNORED_LOCAL_FILE');
    assert.equal(loaded.payer.publicKey.toBase58(), created.payer.publicKey.toBase58());
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 64);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Devnet rehearsal payer accepts a protected environment key and rejects malformed material', async () => {
  const expected = Keypair.generate();
  const loaded = await loadOrCreateDevnetRehearsalPayer({ encoded: JSON.stringify([...expected.secretKey]), file: 'unused' });
  assert.equal(loaded.source, 'PROTECTED_ENV');
  assert.equal(loaded.payer.publicKey.toBase58(), expected.publicKey.toBase58());
  await assert.rejects(
    loadOrCreateDevnetRehearsalPayer({ encoded: '[1,2,3]', file: 'unused' }),
    /64-byte keypair array/,
  );
});

test('Devnet rehearsal payer derives a stable key from a protected persistent seed', async () => {
  const seed = 'render-generated-secret-with-at-least-32-characters';
  const first = await loadOrCreateDevnetRehearsalPayer({ seed, file: 'unused' });
  const second = await loadOrCreateDevnetRehearsalPayer({ seed, file: 'unused', requireProtectedEnv: true });
  assert.equal(first.source, 'PROTECTED_ENV_SEED');
  assert.equal(second.payer.publicKey.toBase58(), first.payer.publicKey.toBase58());
  await assert.rejects(
    loadOrCreateDevnetRehearsalPayer({ seed: 'too-short', file: 'unused' }),
    /at least 32 characters/,
  );
});

test('cloud rehearsal refuses to create or reuse a payer from ephemeral disk', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bond-payer-cloud-'));
  const file = path.join(directory, 'payer.json');
  try {
    await assert.rejects(
      loadOrCreateDevnetRehearsalPayer({ file, requireProtectedEnv: true }),
      /requires BOND_REHEARSAL_PAYER_SEED or BOND_REHEARSAL_PAYER_JSON/,
    );
    await assert.rejects(stat(file), { code: 'ENOENT' });
    await loadOrCreateDevnetRehearsalPayer({ file });
    await assert.rejects(
      loadOrCreateDevnetRehearsalPayer({ file, requireProtectedEnv: true }),
      /refusing to create an ephemeral payer/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
