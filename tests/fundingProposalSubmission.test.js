import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { submitFundingEvidenceProposal } from '../src/campaign/fundingEvidence.js';

const good = {
  founderUserId: 101,
  vaultAddress: '11111111111111111111111111111111',
  observedVaultBaseUnits: '40000000000000',
  conservationVaultAddress: '22222222222222222222222222222222',
  evidenceUrl: 'https://evidence.example/funding',
  evidenceHash: 'a'.repeat(64),
  verifiedAt: '2026-10-01T12:00:00Z',
  now: '2026-10-01T13:00:00Z',
};

test('funding proposal submission is disabled by default', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; } };
  await assert.rejects(submitFundingEvidenceProposal(client, {
    ...good, env: {},
  }), /submission disabled/);
  assert.equal(called, false);
});

test('invalid funding packet never reaches Supabase', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; } };
  await assert.rejects(submitFundingEvidenceProposal(client, {
    ...good,
    conservationVaultAddress: 'bad',
    env: { PROJECT_Q_FUNDING_PROPOSAL_SUBMISSION_ENABLED: 'true' },
  }), /packet is not ready/);
  assert.equal(called, false);
});

test('valid packet submits only the audited funding proposal RPC', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ id: 7, ...args }];
    },
  };
  const result = await submitFundingEvidenceProposal(client, {
    ...good,
    env: { PROJECT_Q_FUNDING_PROPOSAL_SUBMISSION_ENABLED: 'true' },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fn, 'submit_campaign_funding_proposal');
  assert.equal(calls[0].args.p_vault_address, good.vaultAddress);
  assert.equal(calls[0].args.p_conservation_vault_address, good.conservationVaultAddress);
  assert.match(calls[0].args.p_idempotency_key, /^[0-9a-f]{64}$/);
  assert.match(result.packetFingerprint, /^[0-9a-f]{64}$/);
});

test('Render keeps funding proposal submission disabled by default', async () => {
  const yaml = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /PROJECT_Q_FUNDING_PROPOSAL_SUBMISSION_ENABLED[\s\S]*value: "false"/);
});
