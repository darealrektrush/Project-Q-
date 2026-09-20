import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sqlPath = new URL('../supabase/migrations/20260920170000_bond_funding_verification.sql', import.meta.url);

test('funding proposal locks exact Bond treasury facts', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /vault_base_units = 17500000000000/);
  assert.match(sql, /squads_approval_threshold = 2/);
  assert.match(sql, /squads_member_count = 3/);
  assert.match(sql, /top_contributor_prize_lamports = 1000000000/);
  assert.match(sql, /evidence_hash text not null check/);
  assert.match(sql, /evidence_url text not null check/);
});

test('funding finalization requires fresh evidence and two current founder approvals', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /verified_at < now() - interval '72 hours'/);
  assert.match(sql, /latest where decision = 'APPROVE'/);
  assert.match(sql, /approval_count <> 2/);
  assert.match(sql, /campaign requires exactly two enabled founders/);
});

test('funding finalization only updates funded_base_units and never campaign state or treasury', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /set funded_base_units = 17500000000000/);
  assert.doesNotMatch(sql, /set states*=/i);
  assert.doesNotMatch(sql, /insert into public.treasury_transactions/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.treasury_transactions|update\s+public\.treasury_transactions|systemprogram|signtransaction/i);
});

test('funding governance is append-only and service-role only', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /campaign_funding_proposals_immutable/);
  assert.match(sql, /campaign_funding_decisions_immutable/);
  assert.match(sql, /campaign_funding_finalizations_immutable/);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
});

test('funding finalization is only allowed from READINESS_BLOCKED', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /campaign_row.state <> 'READINESS_BLOCKED'/);
  assert.match(sql, /funding can only finalize from READINESS_BLOCKED/);
});
