import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sqlPath = new URL('../supabase/migrations/20260920190000_top_contributor_impact_receipts.sql', import.meta.url);

test('top contributor finalization fails closed on ties and requires frozen verification', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /campaign_row\.state <> 'ALLOCATIONS_FROZEN'/);
  assert.match(sql, /tied_count <> 1/);
  assert.match(sql, /requires an explicit tie policy/);
  assert.match(sql, /finalized campaign funding and impact evidence is required/);
});

test('winner prize and conservation impact are separate immutable receipts', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /WINNER_PRIZE/);
  assert.match(sql, /CONSERVATION_IMPACT/);
  assert.match(sql, /unique \(campaign_id, receipt_type\)/);
  assert.match(sql, /expected_amount := 1000000000/);
  assert.match(sql, /expected_amount := 100000000/);
  assert.match(sql, /campaign_impact_receipts_immutable/);
});

test('database reconciles proof fields and computes proof hash itself', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /impact receipt proof does not reconcile/);
  assert.match(sql, /extensions\.digest\(p_proof::text, 'sha256'\)/);
  assert.doesNotMatch(sql, /p_proof_hash text/);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
});

test('impact receipt migration never signs or sends SOL', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.doesNotMatch(sql, /sendRawTransaction|SystemProgram\.transfer|private key|secret key/i);
});
