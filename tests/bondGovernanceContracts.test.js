import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sqlPath = new URL('../supabase/migrations/20260920160000_reconcile_bond_governance_contracts.sql', import.meta.url);

test('governance reconciliation removes retired seven-cycle and old funding contracts', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.doesNotMatch(sql, /activationVaultBaseUnits|scheduledVaultBaseUnits|\b250000000\b/);
  assert.doesNotMatch(sql, /activeDays[^\n]*14|cycleCount[^\n]*7/);
  assert.match(sql, /squadsCommunityVaultBaseUnits/);
  assert.match(sql, /17500000000000/);
  assert.match(sql, /topContributorPrizeLamports/);
  assert.match(sql, /1000000000/);
});

test('FUNDED transition is bound to the live campaign funding ledger', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /campaign_row\.funded_base_units <> 17500000000000/);
  assert.match(sql, /fundedBaseUnits'\)::numeric <> campaign_row\.funded_base_units/);
  assert.match(sql, /squadsApprovalThreshold'\)::integer <> 2/);
  assert.match(sql, /squadsMemberCount'\)::integer <> 3/);
});

test('SCHEDULED and ACTIVE transitions require actual registry, cycles and draw commitments', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /campaign_row\.registry_version is null/);
  assert.match(sql, /Bond scheduling requires exactly five campaign cycles/);
  assert.match(sql, /readinessReportVersion/);
  assert.match(sql, /readinessReportHash/);
  assert.match(sql, /founderApprovals/);
  assert.match(sql, /campaign_cycle_draw_commitments/);
  assert.match(sql, /commitment_count <> 5/);
});

test('final rules validator is native five-cycle and requires explicit Buy-to-Earn economics', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /activeDays}' is distinct from '10'/);
  assert.match(sql, /cycleCount}' is distinct from '5'/);
  assert.match(sql, /RANKS_3_TO_15/);
  assert.match(sql, /priorWinnerCooldownCycles/);
  assert.match(sql, /buyToEarn,mode/);
  assert.match(sql, /WEIGHT_ONLY/);
  assert.match(sql, /SEPARATE_POOL/);
  assert.match(sql, /tier1NetBuySol/);
  assert.match(sql, /tier2NetBuySol/);
  assert.doesNotMatch(sql, /validate_bond_campaign_final_rules_legacy_seven_cycle/);
});

test('governance reconciliation keeps state mutation service-role only', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /revoke all on function public\.transition_campaign_state/);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.transition_campaign_state[\s\S]*to service_role/);
});
