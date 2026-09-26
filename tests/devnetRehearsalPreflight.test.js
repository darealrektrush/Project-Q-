import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadOrCreateDevnetRehearsalPayer } from '../src/campaign/devnetRehearsalPayer.js';
import { inspectBondDevnetPayer } from '../src/campaign/devnetRehearsalPreflight.js';

const env = {
  BOND_REHEARSAL_NETWORK: 'devnet',
  BOND_REHEARSAL_ACK: 'TEST_ONLY_NO_PRODUCTION_ASSETS',
  BOND_REHEARSAL_PAYER_SEED: 'protected-secret-with-more-than-32-characters',
};
const genesis = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

test('payer preflight is stable and checks balance without a write RPC', async () => {
  const calls = [];
  const connection = {
    getGenesisHash: async () => { calls.push('genesis'); return genesis; },
    getBalance: async () => { calls.push('balance'); return 2_500_000_000; },
  };
  const first = await inspectBondDevnetPayer(connection, env);
  const second = await inspectBondDevnetPayer(connection, env);
  assert.equal(first.payerAddress, second.payerAddress);
  assert.equal(first.meetsScriptMinimum, true);
  assert.equal(first.mutationsPerformed, false);
  assert.deepEqual(calls, ['genesis', 'balance', 'genesis', 'balance']);
});

test('payer preflight rejects ephemeral or wrong-network setups before balance checks', async () => {
  let balanceChecks = 0;
  const connection = {
    getGenesisHash: async () => genesis,
    getBalance: async () => { balanceChecks += 1; return 0; },
  };
  await assert.rejects(inspectBondDevnetPayer(connection, {
    ...env, RENDER: 'true', BOND_REHEARSAL_PAYER_SEED: '',
  }), /requires BOND_REHEARSAL_PAYER_SEED/);
  await assert.rejects(inspectBondDevnetPayer({
    ...connection, getGenesisHash: async () => 'wrong-chain',
  }, env), /genesis hash/);
  await assert.rejects(inspectBondDevnetPayer(connection, {
    ...env, BOND_REHEARSAL_NETWORK: 'localnet',
  }), /isolated devnet configuration/);
  assert.equal(balanceChecks, 0);
});

test('local read-only preflight reuses an existing payer and never creates a missing one', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bond-preflight-'));
  const file = path.join(directory, 'payer.json');
  const connection = {
    getGenesisHash: async () => genesis,
    getBalance: async () => 250_000_000,
  };
  const local = { ...env, BOND_REHEARSAL_PAYER_SEED: '', BOND_REHEARSAL_PAYER_FILE: file };
  try {
    await assert.rejects(inspectBondDevnetPayer(connection, local), /existing local Devnet payer file is required/);
    await assert.rejects(stat(file), { code: 'ENOENT' });
    const existing = await loadOrCreateDevnetRehearsalPayer({ file });
    const report = await inspectBondDevnetPayer(connection, local);
    assert.equal(report.payerSource, 'IGNORED_LOCAL_FILE');
    assert.equal(report.payerAddress, existing.payer.publicKey.toBase58());
    assert.equal(report.meetsScriptMinimum, false);
    await assert.rejects(inspectBondDevnetPayer(connection, { ...local, RENDER: 'true' }), /requires BOND_REHEARSAL_PAYER_SEED/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('payer preflight reports insufficient balance without requesting funding', async () => {
  const connection = {
    getGenesisHash: async () => genesis,
    getBalance: async () => 1_290_999_120,
  };
  const report = await inspectBondDevnetPayer(connection, env);
  assert.equal(report.meetsScriptMinimum, false);
  assert.equal(report.balanceLamports, 1_290_999_120);
});
