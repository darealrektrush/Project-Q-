import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../supabase/migrations/20260930202000_oracle_x_identity_continuity.sql', import.meta.url),
  'utf8',
);
const normalized = sql.toLowerCase().replace(/--[^\n]*/g, '');

test('Project Q treats Oracle X as a replaceable current verification rail', () => {
  assert.match(normalized, /update public\.identity_links/);
  assert.match(normalized, /set x_user_id = btrim\(p_x_user_id\)/);
  assert.match(normalized, /profile_id = v_profile_id/);
  assert.match(normalized, /x identity is already assigned to another campaign profile/i);
});

test('X replacement does not rewrite Project Q historical evidence or economics', () => {
  const protectedTables = [
    'campaign_raid_events',
    'campaign_x_invite_events',
    'campaign_participation_events',
    'xp_ledger',
    'allocations',
    'releases',
    'distribution_transactions',
  ];
  for (const table of protectedTables) {
    assert.doesNotMatch(normalized, new RegExp(`update\\s+public\\.${table}\\b`));
    assert.doesNotMatch(normalized, new RegExp(`delete\\s+from\\s+public\\.${table}\\b`));
  }
});

test('Project Q never creates or transfers Oracle identity ownership during an X update', () => {
  assert.doesNotMatch(normalized, /insert into public\.crabstar_profiles/);
  assert.doesNotMatch(normalized, /insert into public\.telegram_identity/);
  assert.doesNotMatch(normalized, /insert into public\.x_identity/);
  assert.doesNotMatch(normalized, /update public\.x_identity/);
  assert.match(normalized, /oracle campaign profile required/i);
});

test('Oracle identity mirror remains service-role only', () => {
  assert.match(normalized, /revoke all on function public\.link_oracle_identity/);
  assert.match(normalized, /from public, anon, authenticated/);
  assert.match(normalized, /grant execute on function public\.link_oracle_identity[\s\S]*to service_role/);
});
