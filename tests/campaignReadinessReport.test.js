import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAMPAIGN_READINESS_REPORT_VERSION,
  createCampaignReadinessReport,
} from '../src/campaign/readinessReport.js';

function fixture() {
  return {
    campaignId: 'bond-the-duck-2026',
    campaign: {
      state: 'DRAFT', ruleset_version: 1, rules_hash: 'a'.repeat(64),
      funded_base_units: '15000000000000',
    },
    checks: [
      { key: 'funding', ready: true },
      { key: 'rules', ready: true },
    ],
    cycles: [
      { cycle_id: 2, opens_at: '2026-09-03T15:00:00Z', closes_at: '2026-09-05T15:00:00Z' },
      { cycle_id: 1, opens_at: '2026-09-01T15:00:00Z', closes_at: '2026-09-03T15:00:00Z' },
    ],
    sources: [
      { source_key: 'vote-b', source: 'vote', classification: 'MACHINE_VERIFIED' },
      { source_key: 'vote-a', source: 'vote', classification: 'MACHINE_VERIFIED' },
    ],
    sourceCertifications: [
      {
        source_key: 'vote-b', source_kind: 'WEBSITE_VOTE', classification: 'MACHINE_VERIFIED',
        health: 'HEALTHY', evidence_hash: 'c'.repeat(64),
        checked_at: '2026-08-25T10:00:00Z', expires_at: '2026-08-27T10:00:00Z',
      },
      {
        source_key: 'vote-a', source_kind: 'WEBSITE_VOTE', classification: 'MACHINE_VERIFIED',
        health: 'HEALTHY', evidence_hash: 'd'.repeat(64),
        checked_at: '2026-08-25T10:00:00Z', expires_at: '2026-08-27T10:00:00Z',
      },
    ],
    registryHash: 'b'.repeat(64),
    flags: { walletVerification: false, campaignApp: false },
  };
}

test('readiness report hash is deterministic across evidence ordering', () => {
  const first = fixture();
  const second = fixture();
  second.checks.reverse();
  second.cycles.reverse();
  second.sources.reverse();
  second.sourceCertifications.reverse();
  second.flags = { campaignApp: false, walletVerification: false };
  const left = createCampaignReadinessReport(first);
  const right = createCampaignReadinessReport(second);
  assert.equal(left.reportVersion, CAMPAIGN_READINESS_REPORT_VERSION);
  assert.match(left.reportHash, /^[0-9a-f]{64}$/);
  assert.equal(left.reportHash, right.reportHash);
});

test('readiness report hash changes when an evidence-bound gate changes', () => {
  const baseline = createCampaignReadinessReport(fixture()).reportHash;
  const changed = fixture();
  changed.flags.campaignApp = true;
  assert.notEqual(createCampaignReadinessReport(changed).reportHash, baseline);

  const changedFunding = fixture();
  changedFunding.campaign.funded_base_units = '14999999999999';
  assert.notEqual(createCampaignReadinessReport(changedFunding).reportHash, baseline);

  const changedCertification = fixture();
  changedCertification.sourceCertifications[0].health = 'OFFLINE';
  assert.notEqual(createCampaignReadinessReport(changedCertification).reportHash, baseline);
});
