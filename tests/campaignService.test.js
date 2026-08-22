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
} from '../src/campaign/service.js';
import { REQUIRED_REGISTRY_FIELDS } from '../src/campaign/registry.js';

test('missing campaign row remains safely in DRAFT', async () => {
  const client = { select: async () => [] };
  assert.equal((await getCampaignStatus(client)).state, 'DRAFT');
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
  const client = {
    select: async (table) => table === 'identity_links'
      ? [{
          x_user_id: 'x-1', reward_wallet: 'wallet-1', x_verified_at: '2026-08-14T00:00:00Z',
          wallet_verified_at: '2026-08-14T00:00:00Z', fawkq_token_account: 'ata-1',
        }]
      : [{ cycle_id: 1, xp: 12 }, { cycle_id: 2, xp: 7 }],
  };
  const status = await getParticipantStatus(client, 123);
  assert.equal(status.enrolled, true);
  assert.equal(status.walletVerified, true);
  assert.equal(status.rewardWallet, 'wallet-1');
  assert.equal(status.tokenAccountReady, true);
  assert.equal(status.totalXp, 19);
});

test('campaign readiness stays blocked while dates and launch flags are deferred', async () => {
  const client = {
    select: async (table) => {
      if (table === 'campaigns') return [{
        state: 'DRAFT', rules_hash: 'a'.repeat(64), ruleset_version: 1,
        funded_base_units: '15000000000000',
      }];
      if (table === 'verification_sources') {
        return Array.from({ length: 13 }, (_, index) => ({
          source_key: `source-${index}`, classification: 'VERIFIED', source: 'test',
        }));
      }
      if (table === 'deployment_registry') {
        return REQUIRED_REGISTRY_FIELDS.map((field) => ({
          field, value: `value-${field}`, owner: 'owner', evidence_url: 'https://example.com/evidence',
        }));
      }
      return [];
    },
  };
  const readiness = await getCampaignReadiness(client, {
    PROJECT_Q_CAMPAIGN_APP_ENABLED: 'false',
    PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'false',
    PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'false',
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.readyCount, 4);
  assert.equal(readiness.checks.find(({ key }) => key === 'dates').ready, false);
});

test('closed fallback never reports live campaign state', () => {
  const status = closedCampaignStatus();
  assert.deepEqual({ state: status.state, unavailable: status.unavailable }, {
    state: 'DRAFT', unavailable: true,
  });
});
