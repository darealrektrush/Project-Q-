import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCampaignStatus,
  getParticipantStatus,
  closedCampaignStatus,
  getParticipantRaidStatus,
  assertCampaignParticipationEnabled,
  assertWalletVerificationEnabled,
  getCampaignReadiness,
  getCampaignRuntime,
  toPublicCampaignReadiness,
  closedPublicCampaignReadiness,
} from '../src/campaign/service.js';
import { REQUIRED_REGISTRY_FIELDS } from '../src/campaign/registry.js';

test('missing campaign row remains safely in DRAFT', async () => {
  const client = { select: async () => [] };
  assert.equal((await getCampaignStatus(client)).state, 'DRAFT');
});

test('public runtime uses server time and never treats a draft calendar window as operational', async () => {
  const client = { select: async (table) => table === 'campaigns'
    ? [{ id: 'bond-the-duck-2026', state: 'DRAFT' }]
    : [] };
  const runtime = await getCampaignRuntime(client, { now: new Date('2026-09-02T15:00:00Z') });
  assert.equal(runtime.serverNow, '2026-09-02T15:00:00.000Z');
  assert.equal(runtime.schedule.currentCycle, 1);
  assert.equal(runtime.displayLabel, 'LAUNCH BLOCKED');
  assert.equal(runtime.operational, false);
});

test('public runtime opens only with the feature flag and exact seven-cycle database schedule', async () => {
  const cycles = Array.from({ length: 7 }, (_, index) => ({
    cycle_id: index + 1,
    opens_at: new Date(Date.parse('2026-09-01T15:00:00Z') + (index * 48 * 60 * 60 * 1000)).toISOString(),
    closes_at: new Date(Date.parse('2026-09-03T15:00:00Z') + (index * 48 * 60 * 60 * 1000)).toISOString(),
  }));
  const client = { select: async (table) => table === 'campaigns'
    ? [{ id: 'bond-the-duck-2026', state: 'ACTIVE' }]
    : cycles };
  const runtime = await getCampaignRuntime(client, {
    now: new Date('2026-09-02T15:00:00Z'), participationEnabled: true,
  });
  assert.equal(runtime.scheduleReady, true);
  assert.equal(runtime.operational, true);
  assert.equal(runtime.displayLabel, 'CYCLE 1 LIVE');
});

test('public readiness exposes only whitelisted gate status without registry evidence', () => {
  const readiness = toPublicCampaignReadiness({
    campaignId: 'bond-the-duck-2026', state: 'DRAFT',
    reportVersion: 'bond-readiness-v1', reportHash: 'c'.repeat(64),
    secretRegistryValue: 'do-not-expose',
    checks: [
      { key: 'rules', label: 'Rules published and hashed', ready: true, evidence_url: 'private' },
      { key: 'funding', label: 'Funding verified', ready: false, wallet: 'private-wallet' },
      { key: 'internal-secret', label: 'Sensitive operational check', ready: true },
    ],
  });
  assert.equal(readiness.readyCount, 1);
  assert.equal(readiness.totalCount, 2);
  assert.equal(readiness.percent, 50);
  assert.equal(readiness.reportVersion, 'bond-readiness-v1');
  assert.equal(readiness.reportHash, 'c'.repeat(64));
  assert.deepEqual(readiness.checks, [
    { key: 'rules', label: 'Rules published and hashed', ready: true },
    { key: 'funding', label: 'Funding verified', ready: false },
  ]);
  assert.doesNotMatch(JSON.stringify(readiness), /do-not-expose|private-wallet|evidence_url|internal-secret/);
  assert.deepEqual(closedPublicCampaignReadiness().checks, []);
  assert.equal(closedPublicCampaignReadiness().available, false);
  assert.equal(closedPublicCampaignReadiness().reportHash, null);
});

test('campaign participation requires both the deployment gate and ACTIVE database state', async () => {
  const active = { select: async () => [{ id: 'bond-the-duck-2026', state: 'ACTIVE' }] };
  const draft = { select: async () => [{ id: 'bond-the-duck-2026', state: 'DRAFT' }] };
  await assert.rejects(() => assertCampaignParticipationEnabled(active, undefined), /disabled/);
  await assert.rejects(() => assertCampaignParticipationEnabled(active, 'false'), /disabled/);
  await assert.rejects(() => assertCampaignParticipationEnabled(draft, 'true'), /disabled/);
  assert.equal((await assertCampaignParticipationEnabled(active, 'true')).state, 'ACTIVE');
});

test('wallet verification rehearsal requires Oracle X without activating participation', async () => {
  const verified = {
    select: async (table) => table === 'identity_links'
      ? [{ x_user_id: 'x-1', x_verified_at: '2026-08-17T00:00:00Z' }]
      : [],
  };
  const unverified = { select: async () => [] };
  const status = await assertWalletVerificationEnabled(verified, 123, {
    verificationFlag: 'true',
    participationFlag: 'false',
  });
  assert.equal(status.xVerified, true);
  await assert.rejects(
    () => assertWalletVerificationEnabled(unverified, 123, {
      verificationFlag: 'true',
      participationFlag: 'false',
    }),
    /Oracle X identity required/
  );
  await assert.rejects(
    () => assertWalletVerificationEnabled(verified, 123, {
      verificationFlag: 'false',
      participationFlag: 'false',
    }),
    /participation disabled/
  );
});

test('Oracle raid events are summarized for Project Q campaign progress', async () => {
  const client = { select: async () => [
    { raid_id: 'r1', action: 'like', credited: true, reason: null },
    { raid_id: 'r1', action: 'reply', credited: false, reason: null },
    { raid_id: 'r2', action: 'retweet', credited: false, reason: 'duplicate' },
  ] };
  const status = await getParticipantRaidStatus(client, 123);
  assert.equal(status.verifiedActions, 1);
  assert.equal(status.pendingActions, 1);
  assert.equal(status.rejectedActions, 1);
});

test('participant status derives verification readiness and sums XP', async () => {
  const queries = [];
  const client = {
    select: async (table, query) => {
      queries.push([table, query]);
      if (table === 'identity_links') return [{
          x_user_id: 'x-1', reward_wallet: 'wallet-1', x_verified_at: '2026-08-14T00:00:00Z',
          wallet_verified_at: '2026-08-15T00:00:00Z', fawkq_token_account: 'ata-1',
          enrolled_at: '2026-08-13T00:00:00Z',
        }];
      if (table === 'campaign_xp_totals') return [{ cycle_id: 1, xp: 12 }, { cycle_id: 2, xp: 7 }];
      if (table === 'xp_ledger' && query.includes('awarded_at=gte')) return [
        { amount: 5, cap_bucket: 'mission' }, { amount: 3, cap_bucket: 'participation' },
        { amount: 2, cap_bucket: 'trending' },
      ];
      if (table === 'xp_ledger') return [
        { id: 4, cycle_id: 2, source: 'mission', cap_bucket: 'mission', amount: 7,
          mission_code: 'oracle-raids', awarded_at: '2026-08-25T12:00:00Z' },
        { id: 3, cycle_id: 1, source: 'event', cap_bucket: 'participation', amount: 5,
          mission_code: 'community-pulse', awarded_at: '2026-08-24T12:00:00Z' },
        { id: 2, cycle_id: 1, source: 'event', cap_bucket: 'trending', amount: 2,
          mission_code: 'telegram:majorbuybot', awarded_at: '2026-08-24T11:00:00Z' },
      ];
      if (table === 'allocations') return [
        { id: 1, category: 'activity', cycle_id: 1, reward_wallet: 'wallet-1', gross_base_units: '1000000', calc_version: 1, created_at: '2026-08-24T12:00:00Z' },
        { id: 2, category: 'activity', cycle_id: 1, reward_wallet: 'wallet-1', gross_base_units: '1500000', calc_version: 2, created_at: '2026-08-25T12:00:00Z' },
        { id: 3, category: 'buy_to_earn', cycle_id: null, reward_wallet: 'wallet-1', gross_base_units: '2500000', calc_version: 1, created_at: '2026-08-25T12:00:00Z' },
      ];
      if (table === 'releases') return [
        { allocation_id: 2, pct: 25, scheduled_at: '2026-08-26T12:00:00Z', amount_base_units: '375000', status: 'paid', payment_key: 'activity:cycle-1:25' },
        { allocation_id: 2, pct: 75, scheduled_at: '2026-08-27T12:00:00Z', amount_base_units: '1125000', status: 'scheduled', payment_key: 'activity:cycle-1:75' },
        { allocation_id: 3, pct: 25, scheduled_at: '2026-08-26T12:00:00Z', amount_base_units: '625000', status: 'proposed', payment_key: 'buy:campaign:25' },
      ];
      if (table === 'treasury_transactions') return [{
        payment_key: 'activity:cycle-1:25', tx_signature: '5'.repeat(88),
        confirmed_block_time: '2026-08-26T12:02:00Z', reconciliation_status: 'reconciled',
      }];
      if (table === 'positions') return [{ tier: 1, weight: 1, eligible: true, snapshot_usd: '12.50' }];
      if (table === 'campaigns') return [{ state: 'ACTIVE' }];
      return [];
    },
  };
  const status = await getParticipantStatus(client, 123, { now: '2026-08-25T18:00:00Z' });
  assert.equal(status.enrolled, true);
  assert.equal(status.walletVerified, true);
  assert.equal(status.rewardWallet, 'wallet-1');
  assert.equal(status.tokenAccountReady, true);
  assert.equal(status.totalXp, 19);
  assert.equal(status.todayXp, 10);
  assert.deepEqual(status.todayXpByBucket, { participation: 3, mission: 5, trending: 2, other: 0 });
  assert.equal(status.completedMissionCount, 3);
  assert.equal(status.allocationBaseUnits, '4000000');
  assert.deepEqual(status.allocationByCategory, { activity: '1500000', buy_to_earn: '2500000' });
  assert.equal(status.rewards.allocatedBaseUnits, '4000000');
  assert.equal(status.rewards.scheduledBaseUnits, '1750000');
  assert.equal(status.rewards.distributedBaseUnits, '375000');
  assert.equal(status.rewards.failedBaseUnits, '0');
  assert.equal(status.rewards.releaseCount, 3);
  assert.equal(status.rewards.receiptCount, 1);
  assert.equal(status.rewards.releases[0].category, 'activity');
  assert.equal(status.rewards.releases[0].transactionSignature, '5'.repeat(88));
  assert.equal(status.rewards.releases[1].transactionSignature, null);
  assert.equal(status.fawkqTokenAccount, 'ata-1');
  const allocationQuery = queries.find(([table]) => table === 'allocations')[1];
  assert.match(allocationQuery, /gross_base_units/);
  assert.match(allocationQuery, /or=\(telegram_user_id\.eq\.123,reward_wallet\.eq\.wallet-1\)/);
  assert.doesNotMatch(JSON.stringify(status.rewards), /reward_wallet|telegram_user_id|payment_key/);
  assert.equal(status.buyToEarn.eligible, true);
  assert.equal(status.campaignState, 'ACTIVE');
  assert.equal(status.recentActivity[0].missionCode, 'oracle-raids');
});

test('closed fallback never reports live campaign state', () => {
  const status = closedCampaignStatus();
  assert.deepEqual({ state: status.state, unavailable: status.unavailable }, {
    state: 'DRAFT', unavailable: true,
  });
});

test('campaign readiness stays blocked while dates and launch flags are intentionally deferred', async () => {
  const checkedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const client = {
    select: async (table) => {
      if (table === 'campaigns') return [{
        id: 'bond-the-duck-2026', state: 'DRAFT', rules_hash: 'a'.repeat(64),
        ruleset_version: 1, funded_base_units: '15000000000000',
      }];
      if (table === 'ruleset_versions') return [];
      if (table === 'cycles') return [];
      if (table === 'verification_sources') return Array.from({ length: 14 }, (_, index) => ({
        campaign_id: 'bond-the-duck-2026', source_key: `source-${index}`,
        source: index < 9 ? 'vote' : 'event', classification: 'MACHINE_VERIFIED',
      }));
      if (table === 'verification_source_certifications') return Array.from({ length: 14 }, (_, index) => ({
        id: index + 1, campaign_id: 'bond-the-duck-2026', source_key: `source-${index}`,
        source_kind: index < 9 ? 'WEBSITE_VOTE' : 'TELEGRAM_BOT',
        classification: 'MACHINE_VERIFIED', health: 'HEALTHY',
        evidence_url: `https://example.com/source-${index}`, evidence_hash: 'b'.repeat(64),
        checked_at: checkedAt, expires_at: expiresAt,
      }));
      if (table === 'deployment_registry') return REQUIRED_REGISTRY_FIELDS.map((field) => ({
        field, value: `verified-${field}`, owner: 'operations', evidence_url: `https://example.com/${field}`,
      }));
      return [];
    },
  };
  const readiness = await getCampaignReadiness(client, {
    PROJECT_Q_CAMPAIGN_APP_ENABLED: 'false',
    PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'false',
    PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'false',
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.readyCount, 3);
  assert.equal(readiness.checks.find(({ key }) => key === 'rules').ready, false);
  assert.equal(readiness.checks.find(({ key }) => key === 'dates').ready, false);
  assert.equal(readiness.checks.find(({ key }) => key === 'burn-rules').ready, false);
  assert.equal(readiness.checks.find(({ key }) => key === 'burn-progress').ready, false);
  assert.equal(readiness.checks.find(({ key }) => key === 'burn-verification').ready, false);
});
