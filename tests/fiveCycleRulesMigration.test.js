import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../supabase/migrations/20260909020000_validate_bond_five_cycle_rules.sql',
  import.meta.url
);

test('five-cycle governance migration replaces the stale validator without mutating campaign state', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /activeDays}' is distinct from '10'/);
  assert.match(sql, /cycleHours}' is distinct from '48'/);
  assert.match(sql, /cycleCount}' is distinct from '5'/);
  assert.match(sql, /active_closes_at <> active_opens_at \+ interval '10 days'/);
  assert.match(sql, /review_checkpoint_at <> review_opens_at \+ interval '48 hours'/);
  assert.match(sql, /review_closes_at <> review_opens_at \+ interval '72 hours'/);
  assert.match(sql, /campaign_ruleset_proposals_rules_valid_check/);
  assert.match(sql, /campaign_ruleset_proposals_rules_valid_check[\s\S]*not valid/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /revoke all on function[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(sql, /\b(update|insert into|delete from)\s+public\.campaigns\b/i);
  assert.doesNotMatch(sql, /materialize_bond_lifecycle_plan\s*\(/i);
});
