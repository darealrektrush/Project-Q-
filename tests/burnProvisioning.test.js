import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { provisionBondEarnToBurn } from '../src/earnToBurn/provisioning.js';

test('burn provisioning is disabled by default', async () => {
  const client = { rpc: async () => { throw new Error('must not call'); } };
  await assert.rejects(provisionBondEarnToBurn(client, {
    sourceEvidenceUrl: 'https://example.com/source',
    sourceVerifiedAt: '2026-10-01T00:00:00Z',
    env: {},
  }), /disabled/);
});

test('burn provisioning calls one audited RPC when explicitly enabled', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ programId:'fawkq-earn-to-burn', replayed:false }];
    },
  };
  const row = await provisionBondEarnToBurn(client, {
    sourceEvidenceUrl:'https://example.com/source',
    sourceVerifiedAt:'2026-10-01T00:00:00Z',
    env:{ PROJECT_Q_BURN_PROVISIONING_ENABLED:'true' },
  });
  assert.equal(row.programId,'fawkq-earn-to-burn');
  assert.equal(calls.length,1);
  assert.equal(calls[0].fn,'provision_bond_earn_to_burn');
});

test('atomic burn provisioning migration locks final rules and exact campaign economics', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920200000_atomic_bond_burn_provisioning.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql,/rules_json->>'status' <> 'FINAL'/);
  assert.match(sql,/validate_bond_campaign_final_rules/);
  assert.match(sql,/15000000000000/);
  assert.match(sql,/3000000000000/);
  assert.match(sql,/3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa/);
  assert.match(sql,/exactly two enabled campaign founders are required/);
});

test('direct Bond burn configuration inserts are blocked outside atomic provisioning', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920200000_atomic_bond_burn_provisioning.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql,/Bond Earn-to-Burn configuration inserts must use the atomic provisioning RPC/);
  assert.match(sql,/bond_burn_program_insert_guard/);
  assert.match(sql,/bond_burn_source_insert_guard/);
  assert.match(sql,/bond_burn_founder_insert_guard/);
  assert.match(sql,/bond_burn_milestone_insert_guard/);
});

test('Bond burn immutable terms cannot drift after provisioning', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920200000_atomic_bond_burn_provisioning.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql,/program terms are immutable/);
  assert.match(sql,/source account terms are immutable/);
  assert.match(sql,/founders are immutable/);
  assert.match(sql,/milestone terms are immutable/);
});

test('Render keeps provisioning disabled by default', async () => {
  const yaml = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(yaml,/PROJECT_Q_BURN_PROVISIONING_ENABLED[\s\S]*value: "false"/);
});
