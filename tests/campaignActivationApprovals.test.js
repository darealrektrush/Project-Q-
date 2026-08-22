import test from 'node:test';
import assert from 'node:assert/strict';

import {
  founderApprovalConfiguration,
  isConfiguredFounder,
  recordActivationApproval,
} from '../src/campaign/activationApprovals.js';
import { REQUIRED_REGISTRY_FIELDS } from '../src/campaign/registry.js';

const founders = { TELEGRAM_FOUNDER_USER_IDS: '101,202' };

function readyClient(existingApprovals = []) {
  return {
    select: async (table) => {
      if (table === 'campaigns') return [{
        id: 'bond-the-duck-2026', state: 'SCHEDULED', rules_hash: 'a'.repeat(64),
        ruleset_version: 1, funded_base_units: '15000000000000',
      }];
      if (table === 'cycles') return Array.from({ length: 5 }, (_, index) => ({
        cycle_id: index + 1, opens_at: '2026-09-01T00:00:00Z', closes_at: '2026-09-03T00:00:00Z',
      }));
      if (table === 'verification_sources') return Array.from({ length: 13 }, (_, index) => ({
        source_key: `source-${index}`, source: index < 9 ? 'vote' : 'event', classification: 'MACHINE_VERIFIED',
      }));
      if (table === 'deployment_registry') return REQUIRED_REGISTRY_FIELDS.map((field) => ({
        field, value: `value-${field}`, owner: 'owner', evidence_url: 'https://example.com/evidence',
      }));
      if (table === 'campaign_activation_approvals') return existingApprovals;
      return [];
    },
    upsert: async () => {},
  };
}

const flags = {
  ...founders,
  PROJECT_Q_CAMPAIGN_APP_ENABLED: 'true',
  PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'true',
  PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'true',
};

test('founder approval configuration requires exactly two distinct IDs', () => {
  assert.deepEqual(founderApprovalConfiguration(founders), { configured: true, founderCount: 2 });
  assert.equal(isConfiguredFounder(101, founders), true);
  assert.equal(founderApprovalConfiguration({ TELEGRAM_FOUNDER_USER_IDS: '101,101' }).configured, false);
});

test('non-founder cannot record activation approval', async () => {
  await assert.rejects(() => recordActivationApproval(readyClient(), 303, true, flags), /configured founder/);
});

test('approval requires every readiness gate and SCHEDULED state', async () => {
  await assert.rejects(() => recordActivationApproval(readyClient(), 101, true, {
    ...flags, PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'false',
  }), /readiness gates/);
  const client = readyClient();
  const originalSelect = client.select;
  client.select = async (table, query) => table === 'campaigns'
    ? [{ id: 'bond-the-duck-2026', state: 'DRAFT', rules_hash: 'a'.repeat(64), ruleset_version: 1, funded_base_units: '15000000000000' }]
    : originalSelect(table, query);
  await assert.rejects(() => recordActivationApproval(client, 101, true, flags), /SCHEDULED/);
});

test('readiness hash changes when a launch flag changes', async () => {
  const client = readyClient();
  const first = await import('../src/campaign/service.js').then(({ getCampaignReadiness }) => getCampaignReadiness(client, flags));
  const second = await import('../src/campaign/service.js').then(({ getCampaignReadiness }) => getCampaignReadiness(client, {
    ...flags, PROJECT_Q_CAMPAIGN_APP_ENABLED: 'false',
  }));
  assert.notEqual(first.reportHash, second.reportHash);
});
