import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FUNDING_REGISTRY_FIELDS,
  buildFundingVaultText,
  getFundingVaultStatus,
} from '../src/campaign/funding.js';

test('funding dashboard remains blocked with no registry or funding evidence', async () => {
  const client = {
    select: async (table) => table === 'campaigns'
      ? [{ state: 'DRAFT', funded_base_units: '0' }]
      : [],
  };
  const status = await getFundingVaultStatus(client);
  assert.equal(status.ready, false);
  assert.equal(status.databaseFundingReady, false);
  assert.equal(status.registeredVaultCount, 0);
  assert.match(buildFundingVaultText(status), /0 \/ 15,000,000 FAWKQ recorded/);
  assert.match(buildFundingVaultText(status), /no transfer controls/);
});

test('registered evidence is separate from independent on-chain verification', async () => {
  const registry = [
    { field: 'fawkq_mint_decimals', value: 'mint:6', owner: 'ops', evidence_url: 'https://example.com/mint' },
    { field: 'founder_funding_wallets', value: 'wallets', owner: 'founders', evidence_url: 'https://example.com/funding' },
    ...FUNDING_REGISTRY_FIELDS.map(({ key }) => ({
      field: key, value: `address-${key}`, owner: 'Squads 2-of-3', evidence_url: `https://example.com/${key}`,
    })),
  ];
  const client = {
    select: async (table) => table === 'campaigns'
      ? [{ state: 'DRAFT', funded_base_units: '15000000000000' }]
      : registry,
  };
  const status = await getFundingVaultStatus(client);
  assert.equal(status.databaseFundingReady, true);
  assert.equal(status.registryReady, true);
  assert.equal(status.evidencedVaultCount, FUNDING_REGISTRY_FIELDS.length);
  assert.equal(status.onChainVerified, false);
  assert.equal(status.ready, false);
});

test('address without owner and evidence never counts as evidenced', async () => {
  const client = {
    select: async (table) => table === 'campaigns'
      ? [{ state: 'DRAFT', funded_base_units: '0' }]
      : [{ field: 'cycle_activation_vault', value: 'address-only', owner: null, evidence_url: null }],
  };
  const status = await getFundingVaultStatus(client);
  assert.equal(status.registeredVaultCount, 1);
  assert.equal(status.evidencedVaultCount, 0);
  assert.match(buildFundingVaultText(status), /address only/);
});
