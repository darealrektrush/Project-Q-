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
});

test('Render waits for checks before deploying managed services', async () => {
  const blueprint = await read('render.yaml');
  const managedServices = (blueprint.match(/autoDeployTrigger: checksPass/g) ?? []).length;
  assert.equal(managedServices, 3);
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
