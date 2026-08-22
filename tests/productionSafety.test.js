import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Render keeps money-moving and publishing jobs disabled by default', async () => {
  const blueprint = await read('render.yaml');
  assert.match(
    blueprint,
    /PROJECT_Q_DISTRIBUTIONS_ENABLED\n\s+value: "false"/
  );
  assert.match(
    blueprint,
    /PROJECT_Q_SIGNALS_ENABLED\n\s+value: "false"/
  );
  assert.match(
    blueprint,
    /PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED\n\s+value: "false"/
  );
});

test('Render waits for checks before deploying managed services', async () => {
  const blueprint = await read('render.yaml');
  const managedServices = (blueprint.match(/autoDeployTrigger: checksPass/g) ?? []).length;
  assert.equal(managedServices, 4);
});

test('configured founders can route private admin commands to the authorization layer', async () => {
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /if \(command === '\/adminf'\)/);
  assert.match(server, /if \(command === '\/admincancel'\)/);
  assert.doesNotMatch(server, /!isPrivate && command === '\/adminf'/);
});

test('Phase 1 reconciliation migration contains runtime-critical tables and RLS', async () => {
  const migration = await read(
    'supabase/migrations/20260819050834_reconcile_project_q_phase1.sql'
  );
  for (const table of [
    'bagwork_payouts',
    'bagwork_clearances',
    'bagwork_feedback',
    'distribution_runs',
    'distribution_transactions',
    'scheduled_events',
    'signals',
    'signal_interactions',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test('Bond the Duck participation migration remains server-only and fail-closed', async () => {
  const migration = await read(
    'supabase/migrations/20260822030000_bond_the_duck_identity_and_participation.sql'
  );
  assert.match(migration, /create table if not exists public\.campaign_participation_events/);
  assert.match(migration, /alter table public\.campaign_participation_events enable row level security/);
  assert.match(migration, /revoke all on public\.campaign_participation_events from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.link_oracle_identity[\s\S]+to service_role/);
  assert.match(migration, /campaigns where id = p_campaign_id and state = 'ACTIVE'/);
  assert.match(migration, /participation source type does not match registry/);
});
