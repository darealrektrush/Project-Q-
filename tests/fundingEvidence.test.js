import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildFundingEvidencePacket,
  fundingProposalIdempotencyKey,
} from '../src/campaign/fundingEvidence.js';

const good = {
  founderUserId: 101,
  vaultAddress: '11111111111111111111111111111111',
  conservationVaultAddress: '22222222222222222222222222222222',
  evidenceUrl: 'https://evidence.example/squads-vault',
  evidenceHash: 'a'.repeat(64),
  verifiedAt: '2026-10-01T12:00:00Z',
  now: '2026-10-01T13:00:00Z',
};

test('funding evidence packet is ready only for the exact locked funding facts', () => {
  const packet = buildFundingEvidencePacket(good);
  assert.equal(packet.ready, true);
  assert.equal(packet.reasons.length, 0);
  assert.equal(packet.evidence.vaultBaseUnits, '17500000000000');
  assert.equal(packet.evidence.squadsApprovalThreshold, 2);
  assert.equal(packet.evidence.squadsMemberCount, 3);
  assert.equal(packet.evidence.topContributorPrizeLamports, '1000000000');
  assert.equal(packet.evidence.conservationContributionLamports, '100000000');
  assert.equal(packet.evidence.totalSolCommitmentLamports, '1100000000');
  assert.equal(packet.evidence.conservationVaultAddress, good.conservationVaultAddress);
  assert.equal(packet.evidence.conservationAttribution, 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY');
  assert.match(packet.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(packet.proposal.p_idempotency_key, /^[0-9a-f]{64}$/);
  assert.equal(packet.mutationsPerformed, false);
});

test('funding evidence packet fails closed on stale, wrong amount, wrong authority or missing proof', () => {
  for (const patch of [
    { vaultBaseUnits: '17499999999999' },
    { squadsApprovalThreshold: 1 },
    { squadsMemberCount: 4 },
    { topContributorPrizeLamports: '999999999' },
    { conservationContributionLamports: '99999999' },
    { totalSolCommitmentLamports: '1000000000' },
    { conservationVaultAddress: 'bad' },
    { conservationAttribution: 'LEGAL_NAME' },
    { evidenceUrl: 'http://evidence.example/vault' },
    { evidenceHash: 'bad' },
    { verifiedAt: '2026-09-20T00:00:00Z' },
    { vaultAddress: 'bad' },
  ]) {
    const packet = buildFundingEvidencePacket({ ...good, ...patch });
    assert.equal(packet.ready, false);
    assert.equal(packet.proposal, null);
    assert.ok(packet.reasons.length > 0);
  }
});

test('funding proposal idempotency binds founder, vault, proof and verification time', () => {
  const input = {
    campaignId: 'bond-the-duck-2026',
    founderUserId: 101,
    vaultAddress: good.vaultAddress,
    conservationVaultAddress: good.conservationVaultAddress,
    evidenceHash: good.evidenceHash,
    verifiedAt: '2026-10-01T12:00:00.000Z',
  };
  const key = fundingProposalIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(fundingProposalIdempotencyKey(input), key);
  assert.notEqual(fundingProposalIdempotencyKey({ ...input, founderUserId: 202 }), key);
});

test('read-only funding audit script does not call Supabase or funding mutation RPCs', async () => {
  const script = await readFile(new URL('../scripts/audit-bond-funding.js', import.meta.url), 'utf8');
  assert.match(script, /buildFundingEvidencePacket/);
  assert.doesNotMatch(script, /supabase|submit_campaign_funding_proposal|record_campaign_funding_decision|finalize_campaign_funding/);
});
