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
  assert.match(blueprint, /PROJECT_Q_EARN_TO_BURN_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_BURN_VERIFICATION_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_COMMUNITY_ACTIVITY_SETTLEMENT_ENABLED\n\s+value: "false"/);
});

test('Earn to Burn migration is server-only, append-only and two-founder gated', async () => {
  const migration = await read('supabase/migrations/20260825041852_earn_to_burn_engine.sql');
  for (const table of [
    'earn_to_burn_programs','burn_source_accounts','burn_program_founders','burn_milestones',
    'burn_progress_events','burn_proposals','burn_proposal_approvals','burn_receipts',
    'burn_publication_drafts','burn_audit_log',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /revoke all on public\.earn_to_burn_programs[\s\S]+from anon, authenticated/);
  assert.match(migration, /reject_immutable_burn_ledger_mutation/);
  assert.match(migration, /approval_count = 2/);
  assert.match(migration, /requires exactly two configured founders/);
  assert.match(migration, /verified burn proof identity mismatch/);
  assert.match(migration, /CREATOR_WALLET_RESERVE/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /sync_earn_to_burn_xp_progress/);
  assert.match(migration, /create_burn_proposal/);
  assert.match(migration, /burn proposal terms are immutable/);
  assert.match(migration, /invalid burn proposal state transition/);
  assert.match(migration, /burn transaction signature is immutable outside approved attachment/);
  assert.match(migration, /burn publication drafts must begin in DRAFT/);
  assert.match(migration, /approved burn publication content is immutable/);
  assert.match(migration, /stale publication draft hash/);
  assert.match(migration, /approve_burn_publication_draft/);
  assert.match(migration, /mark_burn_publication_published/);
  assert.match(migration, /campaign is not active/);
  assert.match(migration, /on conflict \(program_id, source_kind, source_ref\) do nothing/);
  assert.match(migration, /supply_before_base_units - supply_after_base_units = amount_base_units/);
  assert.doesNotMatch(migration, /slot bigint not null unique/);
});

test('Render waits for checks before deploying managed services', async () => {
  const blueprint = await read('render.yaml');
  const managedServices = (blueprint.match(/autoDeployTrigger: checksPass/g) ?? []).length;
  assert.equal(managedServices, 5);
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

test('staged migrations cover every current Supabase foreign-key advisor finding', async () => {
  const phaseOneSchema = await read(
    'supabase/migrations/20260819050834_reconcile_project_q_phase1.sql'
  );
  const phaseOneIndexes = await read(
    'supabase/migrations/20260819053000_index_project_q_foreign_keys.sql'
  );
  for (const index of [
    'bagwork_clearances_user_id_idx',
    'bagwork_feedback_user_id_idx',
    'bagwork_payouts_user_id_idx',
    'user_missions_mission_id_idx',
  ]) {
    assert.match(phaseOneIndexes, new RegExp(`create index if not exists ${index}`));
  }
  assert.match(
    phaseOneSchema,
    /create index if not exists distribution_transactions_run_idx[\s\S]+distribution_transactions\(run_id\)/
  );
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
