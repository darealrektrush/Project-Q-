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
  assert.match(blueprint, /PROJECT_Q_CAMPAIGN_READINESS_APPROVALS_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_CAMPAIGN_RULES_GOVERNANCE_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_SOURCE_CERTIFICATION_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_TRENDING_RECEIPTS_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED\n\s+value: "false"/);
  assert.match(blueprint, /PROJECT_Q_COMMUNITY_ACTIVITY_SETTLEMENT_ENABLED\n\s+value: "false"/);
});

test('webhook secrets use constant-time comparison and JSON bodies stay bounded', async () => {
  const server = await read('src/server.js');
  assert.match(server, /express\.json\(\{ limit: '100kb', strict: true \}\)/);
  assert.match(server, /secretMatches\(header, TELEGRAM_WEBHOOK_SECRET\)/);
  assert.match(server, /secretMatches\(header, BAGWORK_SECRET\)/);
});

test('verification source certifications are append-only, private and non-activating', async () => {
  const migration = await read(
    'supabase/migrations/20260825233000_verification_source_certifications.sql'
  );
  assert.match(migration, /create table if not exists public\.verification_source_certifications/);
  assert.match(migration, /source_kind in \('WEBSITE_VOTE','TELEGRAM_BOT'\)/);
  assert.match(migration, /expires_at <= checked_at \+ interval '72 hours'/);
  assert.match(migration, /verification_source_certifications_immutable/);
  assert.match(migration, /before update or delete on public\.verification_source_certifications/);
  assert.match(migration, /security invoker set search_path = ''/);
  assert.match(migration, /founder is not authorized for this campaign/);
  assert.match(migration, /certification does not match registered source/);
  assert.match(migration, /alter table public\.verification_source_certifications enable row level security/);
  assert.match(migration, /revoke all on public\.verification_source_certifications[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.record_verification_source_certification[\s\S]+to service_role/);
  assert.doesNotMatch(migration, /insert into public\.verification_sources/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
  assert.doesNotMatch(migration, /funded_base_units/i);
});

test('five confirmed Telegram bots are registered pending evidence without activating rewards', async () => {
  const migration = await read(
    'supabase/migrations/20260825234000_register_bond_telegram_bots.sql'
  );
  for (const sourceKey of [
    'telegram:majorbuybot', 'telegram:wtftrending', 'telegram:trenchobot',
    'telegram:bbtrendingbot', 'telegram:drokiatrendsbot',
  ]) {
    assert.match(migration, new RegExp(sourceKey));
  }
  assert.match(migration, /'telegram:majorbuybot', 'PROOF_SUPPORTED', 7200/);
  assert.match(migration, /'telegram:wtftrending', 'PROOF_SUPPORTED', 3600/);
  assert.match(migration, /'telegram:trenchobot', 'PROOF_SUPPORTED', 86400/);
  assert.match(migration, /'telegram:bbtrendingbot', 'PROOF_SUPPORTED', 3600/);
  assert.match(migration, /'telegram:drokiatrendsbot', 'PROOF_SUPPORTED', 3600/);
  assert.match(migration, /matching_bots <> 5 or registered_bot_total <> 5/);
  assert.match(migration, /add column if not exists target_url text/);
  assert.doesNotMatch(migration, /insert into public\.verification_source_certifications/i);
  assert.doesNotMatch(migration, /insert into public\.xp_ledger/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
});

test('repeat Trending Push mechanics are auditable and remain non-activating', async () => {
  const migration = await read(
    'supabase/migrations/20260826001000_lock_repeat_trending_push_mechanics.sql'
  );
  assert.match(migration, /cap_bucket in \('participation','mission','trending','other'\)/);
  assert.match(migration, /'telegram:majorbuybot' then 7200/);
  assert.match(migration, /'telegram:wtftrending' then 3600/);
  assert.match(migration, /'telegram:trenchobot' then 86400/);
  assert.match(migration, /campaign_participation_events_trending_rank_idx/);
  assert.match(migration, /where source = 'event' and credited = true/);
  assert.doesNotMatch(migration, /insert into public\.xp_ledger/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
});

test('nine founder-supplied voting URLs are registered pending certification only', async () => {
  const migration = await read(
    'supabase/migrations/20260825235000_register_bond_voting_websites.sql'
  );
  for (const sourceKey of [
    'web:geckoterminal', 'web:top100token', 'web:coinmooner', 'web:gemfinder',
    'web:coinsniper', 'web:coinmun', 'web:coinboom', 'web:coinbuzzer', 'web:coinscope',
  ]) {
    assert.match(migration, new RegExp(sourceKey));
  }
  assert.match(migration, /'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote'/);
  assert.match(migration, /matching_websites <> 9 or registered_website_total <> 9/);
  assert.doesNotMatch(migration, /insert into public\.verification_source_certifications/i);
  assert.doesNotMatch(migration, /insert into public\.xp_ledger/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
});

test('website vote proof workflow is private, review-gated and fail-closed', async () => {
  const migration = await read(
    'supabase/migrations/20260826002000_website_vote_proof_workflow.sql'
  );
  for (const table of ['website_vote_attempts', 'website_vote_reviews']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /expires_at <= started_at \+ interval '15 minutes'/);
  assert.match(migration, /website_vote_attempts_one_open_idx/);
  assert.match(migration, /website_vote_attempts_proof_sha_idx/);
  assert.match(migration, /website_vote_reviews_immutable/);
  assert.match(migration, /'bond-vote-proofs', 'bond-vote-proofs', false, 2097152/);
  assert.match(migration, /allowed_mime_types @> array\['image\/jpeg','image\/png','image\/webp'\]/);
  assert.match(migration, /website vote attempt rate limit reached/);
  assert.match(migration, /classification not in \('MACHINE_VERIFIED','PROOF_SUPPORTED'\)/);
  assert.match(migration, /website vote attempt does not belong to participant/);
  assert.match(migration, /website vote challenge does not match attempt/);
  assert.match(migration, /participation source certification is missing, stale or unhealthy/);
  assert.match(migration, /reviewer is not authorized for this campaign/);
  assert.match(migration, /public\.ingest_campaign_participation_event/);
  assert.match(migration, /'web:geckoterminal' then 'COMMUNITY_PROGRESS_ONLY'/);
  assert.match(migration, /proof_supported_count <> 3/);
  assert.match(migration, /revoke all on public\.website_vote_attempts, public\.website_vote_reviews[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.review_website_vote_proof[\s\S]+to service_role/);
  assert.doesNotMatch(migration, /insert into public\.xp_ledger/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
});

test('Telegram trending receipts bind permanent IDs, paired context and global replay protection', async () => {
  const migration = await read(
    'supabase/migrations/20260826003000_telegram_trending_receipt_workflow.sql'
  );
  for (const [source, numericId] of [
    ['telegram:majorbuybot', '7098195052'],
    ['telegram:wtftrending', '7812045152'],
    ['telegram:trenchobot', '8094927043'],
    ['telegram:bbtrendingbot', '8196088162'],
    ['telegram:drokiatrendsbot', '8500408157'],
  ]) {
    assert.match(migration, new RegExp(`'${source}', ${numericId}`));
  }
  for (const table of [
    'telegram_trending_source_configs',
    'telegram_trending_receipt_contexts',
    'telegram_trending_receipts',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /verification_mode in \('DIRECT_RECEIPT','PAIRED_CONTEXT'\)/);
  assert.match(migration, /'telegram:wtftrending', 7812045152,[\s\S]+?'PAIRED_CONTEXT'/);
  assert.match(migration, /unique \(campaign_id, receipt_hash\)/);
  assert.match(migration, /matching fresh FAWKQ context is required/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /order by certification\.checked_at desc, certification\.id desc/);
  assert.match(migration, /revoke all on function public\.ingest_telegram_trending_receipt[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.ingest_telegram_trending_receipt[\s\S]+to service_role/);
  assert.doesNotMatch(migration, /insert into public\.xp_ledger/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
});

test('campaign activation requires two current approvals for the exact readiness report', async () => {
  const migration = await read(
    'supabase/migrations/20260825230000_campaign_readiness_approvals.sql'
  );
  for (const table of ['campaign_founders', 'campaign_readiness_approvals']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /campaign_readiness_approvals_immutable/);
  assert.match(migration, /before update or delete on public\.campaign_readiness_approvals/);
  assert.match(migration, /security invoker set search_path = ''/);
  assert.match(migration, /p_decision is null or p_decision not in \('APPROVE','HOLD'\)/);
  assert.match(migration, /campaign requires exactly two enabled founders/);
  assert.match(migration, /where id = p_campaign_id and state = 'SCHEDULED'/);
  assert.match(migration, /new\.evidence->>'readinessReportHash'/);
  assert.match(migration, /new\.evidence->>'readinessReportVersion'/);
  assert.match(migration, /distinct on \(approval\.founder_user_id\)/);
  assert.match(migration, /where decision = 'APPROVE'/);
  assert.match(migration, /approval_count <> 2/);
  assert.match(migration, /before insert on public\.campaign_state_transitions/);
  assert.match(migration, /revoke all on public\.campaign_founders, public\.campaign_readiness_approvals[\s\S]+from public, anon, authenticated/);
  assert.doesNotMatch(migration, /update public\.campaigns set state = 'ACTIVE'/i);
  const campaignSchema = await read('supabase/bond_the_duck.sql');
  assert.match(
    campaignSchema,
    /array\['readinessReportVersion','readinessReportHash','founderApprovals'\]/
  );
});

test('Bond the Duck draft provisioning is inert, idempotent and evidence-safe', async () => {
  const migration = await read(
    'supabase/migrations/20260825231000_provision_bond_the_duck_draft.sql'
  );
  assert.match(migration, /'bond-the-duck-2026', 1, expected_rules_hash, null, 'DRAFT', 0/);
  assert.match(migration, /"status":"DRAFT"/);
  assert.match(migration, /"campaignRewardsBaseUnits":"15000000000000"/);
  assert.match(migration, /"diamondDuckBaseUnits":"2500000000000"/);
  assert.match(migration, /"topContributorLamports":"1000000000"/);
  assert.match(migration, /"earnToBurnBaseUnits":"15000000000000"/);
  assert.match(migration, /on conflict \(id\) do nothing/);
  assert.match(migration, /on conflict \(campaign_id, version\) do nothing/);
  assert.match(migration, /refusing to provision over a changed Bond the Duck campaign/);
  assert.match(migration, /refusing to provision over Bond the Duck cycle evidence/);
  assert.match(migration, /matching_cycles <> 7/);
  assert.doesNotMatch(migration, /insert into public\.campaign_founders/i);
  assert.doesNotMatch(migration, /insert into public\.verification_sources/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
  assert.doesNotMatch(migration, /'ACTIVE'/);
  assert.doesNotMatch(migration, /funded_base_units[^\n]+15000000000000/i);
});

test('final campaign rules require exact semantics and two current founder approvals', async () => {
  const migration = await read(
    'supabase/migrations/20260825232000_campaign_ruleset_governance.sql'
  );
  for (const table of [
    'campaign_ruleset_proposals', 'campaign_ruleset_decisions', 'campaign_ruleset_finalizations',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}_immutable`));
  }
  assert.match(migration, /validate_bond_campaign_final_rules/);
  assert.match(migration, /security invoker set search_path = ''/);
  assert.match(migration, /is distinct from 'bond-the-duck-2026'/);
  assert.match(migration, /campaignRewardsBaseUnits.*15000000000000/);
  assert.match(migration, /diamondDuckBaseUnits.*2500000000000/);
  assert.match(migration, /topContributorLamports.*1000000000/);
  assert.match(migration, /earnToBurnBaseUnits.*15000000000000/);
  assert.match(migration, /milestone_burn_total = 15000000000000/);
  assert.match(migration, /telegramBotDailyMaximumXp.*20/);
  assert.match(migration, /telegramBotRepeatXp.*1/);
  assert.match(migration, /telegramPushPointPerAcceptedVote.*1/);
  assert.match(migration, /@drokiatrendsbot/);
  assert.match(migration, /CoinScope/);
  assert.match(migration, /campaign requires exactly two enabled founders/);
  assert.match(migration, /distinct on \(decision\.founder_user_id\)/);
  assert.match(migration, /approval_count <> 2/);
  assert.match(migration, /insert into public\.ruleset_versions/);
  assert.match(migration, /update public\.campaigns set[\s\S]+ruleset_version = proposal\.version[\s\S]+rules_hash = proposal\.rules_hash/);
  assert.match(migration, /revoke all on public\.campaign_ruleset_proposals[\s\S]+from public, anon, authenticated/);
  assert.doesNotMatch(migration, /state\s*=\s*'ACTIVE'/i);
  assert.doesNotMatch(migration, /funded_base_units\s*=/i);
  assert.doesNotMatch(migration, /insert into public\.campaign_state_transitions/i);
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
  assert.match(
    migration,
    /reject_immutable_burn_ledger_mutation\(\)[\s\S]+set search_path = pg_catalog/,
  );
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

test('Bond founder registration is numeric-ID bound and cannot activate Earn to Burn', async () => {
  const migration = await read(
    'supabase/migrations/20260827020000_register_bond_founders_and_burn_source_identity.sql'
  );
  assert.match(migration, /8560606243, '@darealrektrush'/);
  assert.match(migration, /1767783978, '@AndrewNicholls'/);
  assert.match(migration, /enabled_founders <> 2 or expected_founders <> 2/);
  assert.match(migration, /add column if not exists founder_label text/);
  assert.match(migration, /state = 'DRAFT'/);
  assert.doesNotMatch(migration, /insert into public\.earn_to_burn_programs/i);
  assert.doesNotMatch(migration, /insert into public\.burn_program_founders/i);
  assert.doesNotMatch(migration, /insert into public\.burn_milestones/i);
  assert.doesNotMatch(migration, /insert into public\.burn_source_accounts/i);
  assert.doesNotMatch(migration, /update public\.campaigns/i);
  assert.doesNotMatch(migration, /state\s*=\s*'ACTIVE'/i);
});

test('Render waits for checks before deploying managed services', async () => {
  const blueprint = await read('render.yaml');
  const managedServices = (blueprint.match(/autoDeployTrigger: checksPass/g) ?? []).length;
  assert.equal(managedServices, 5);
});

test('configured founders can route private admin commands to the authorization layer', async () => {
  const [server, blueprint] = await Promise.all([
    readFile(new URL('../src/server.js', import.meta.url), 'utf8'),
    read('render.yaml'),
  ]);
  assert.match(server, /if \(command === '\/adminf'\)/);
  assert.match(server, /if \(command === '\/admincancel'\)/);
  assert.doesNotMatch(server, /!isPrivate && command === '\/adminf'/);
  assert.match(blueprint, /- key: TELEGRAM_ADMIN_USER_IDS\n\s+sync: false/);
  assert.doesNotMatch(blueprint, /- key: TELEGRAM_ADMIN_USER_IDS\n\s+value:/);
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
  const flywheelIndexes = await read(
    'supabase/migrations/20260825215000_index_campaign_flywheel_foreign_keys.sql'
  );
  const verificationIndexes = await read(
    'supabase/migrations/20260826030000_index_campaign_verification_foreign_keys.sql'
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
  for (const index of [
    'burn_audit_log_proposal_id_idx',
    'burn_progress_events_campaign_id_idx',
    'burn_proposals_campaign_id_idx',
    'burn_receipts_campaign_id_idx',
    'campaign_referrals_bonus_xp_ledger_id_idx',
    'campaign_referrals_campaign_code_idx',
    'campaign_referrals_first_xp_ledger_id_idx',
    'campaign_x_invites_bonus_xp_ledger_id_idx',
  ]) {
    assert.match(flywheelIndexes, new RegExp(`create index if not exists ${index}`));
  }
  for (const index of [
    'campaign_readiness_approvals_founder_idx',
    'campaign_ruleset_decisions_founder_idx',
    'campaign_ruleset_decisions_proposal_campaign_idx',
    'campaign_ruleset_finalizations_founder_idx',
    'campaign_ruleset_finalizations_proposal_campaign_idx',
    'campaign_ruleset_proposals_founder_idx',
    'telegram_trending_receipts_source_idx',
    'telegram_trending_receipts_context_idx',
    'telegram_trending_source_configs_founder_idx',
    'verification_source_certifications_founder_idx',
    'website_vote_attempts_participation_event_idx',
  ]) {
    assert.match(verificationIndexes, new RegExp(`create index if not exists ${index}`));
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
  assert.match(migration, /make_interval\(secs => source_row\.cooldown_seconds\)/);
  assert.match(migration, /participation source is on cooldown for this participant/);
});

test('locked Bond reward values migration only updates the inert DRAFT ruleset', async () => {
  const migration = await read(
    'supabase/migrations/20260827030000_lock_bond_reward_values_and_burn_plan.sql'
  );
  assert.match(migration, /expected_rules#>>'\{referrals,bonusXp\}' <> '10'/);
  assert.match(migration, /expected_rules#>>'\{referrals,xInviteBonusXp\}' <> '5'/);
  assert.match(migration, /jsonb_array_length\(expected_rules#>'\{earnToBurn,milestones\}'\) <> 5/);
  assert.match(migration, /campaign_row\.state <> 'DRAFT'/);
  assert.match(migration, /campaign_row\.funded_base_units <> 0/);
  assert.match(migration, /campaign_ruleset_proposals/);
  assert.match(migration, /campaign_ruleset_finalizations/);
  assert.match(migration, /insert into public\.ruleset_versions/);
  assert.match(migration, /ruleset_version = 2/);
  assert.doesNotMatch(migration, /update\s+public\.ruleset_versions/i);
  assert.doesNotMatch(migration, /set\s+state\s*=\s*'ACTIVE'/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.xp_ledger/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(earn_to_burn_programs|burn_milestones|burn_proposals)/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.campaign_state_transitions/i);
});

test('exact queued campaign bonuses are atomic, final-rules gated and service-only', async () => {
  const migration = await read(
    'supabase/migrations/20260827040000_lock_bond_bonus_queue_and_settlement.sql'
  );
  assert.match(migration, /insert into public\.ruleset_versions/);
  assert.match(migration, /ruleset_version = 3/);
  assert.match(migration, /bonusCapPolicy.*QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP/);
  assert.doesNotMatch(migration, /update\s+public\.ruleset_versions/i);
  assert.match(migration, /campaign_row\.state <> 'DRAFT'/);
  assert.match(migration, /campaign_row\.funded_base_units <> 0/);
  assert.match(migration, /create index if not exists campaign_referrals_pending_bonus_idx/);
  assert.match(migration, /create index if not exists campaign_x_invites_pending_bonus_idx/);
  assert.match(migration, /only the first bonus XP ledger link may be attached/);
  assert.match(migration, /guard_campaign_bonus_queue_before_freeze/);
  assert.match(migration, /new\.from_state = 'VERIFYING' and new\.to_state = 'ALLOCATIONS_FROZEN'/);
  assert.match(migration, /all exact campaign bonuses must settle before allocations freeze/);
  assert.match(migration, /security invoker[\s\S]+set search_path = public/);
  assert.match(migration, /campaign_row\.state not in \('ACTIVE', 'VERIFYING'\)/);
  assert.match(migration, /rules_row\.rules_json->>'status' <> 'FINAL'/);
  assert.match(migration, /rules_row\.rules_hash <> campaign_row\.rules_hash/);
  assert.match(migration, /rules_row\.rules_json#>>'\{referrals,bonusXp\}' <> '10'/);
  assert.match(migration, /rules_row\.rules_json#>>'\{referrals,xInviteBonusXp\}' <> '5'/);
  assert.match(migration, /used_xp \+ bonus_amount > 75/);
  assert.match(migration, /'status', 'QUEUED_DAILY_CAP', 'amount', 0/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /lock table public\.xp_ledger in share row exclusive mode/);
  assert.match(migration, /on conflict \(campaign_id, idempotency_key\) do nothing/);
  assert.match(migration, /revoke all on function public\.settle_campaign_bonus_award\(text,text,bigint\)[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.settle_campaign_bonus_award\(text,text,bigint\)[\s\S]+to service_role/);
  assert.doesNotMatch(migration, /set\s+state\s*=\s*'ACTIVE'/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(earn_to_burn_programs|burn_milestones|burn_proposals)/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.campaign_state_transitions/i);
});
