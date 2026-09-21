import { createHash } from 'node:crypto';

import { isEnabled } from '../lib/featureFlags.js';

export const BOND_FUNDING_BASE_UNITS = '17500000000000';
export const BOND_SQUADS_APPROVAL_THRESHOLD = 2;
export const BOND_SQUADS_MEMBER_COUNT = 3;
export const BOND_TOP_CONTRIBUTOR_LAMPORTS = '1000000000';
export const BOND_CONSERVATION_CONTRIBUTION_LAMPORTS = '100000000';
export const BOND_TOTAL_SOL_COMMITMENT_LAMPORTS = '1100000000';
export const BOND_FUNDING_MAX_AGE_MS = 72 * 60 * 60 * 1000;

const WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^[0-9a-f]{64}$/;

function httpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function fundingProposalIdempotencyKey({
  campaignId,
  founderUserId,
  vaultAddress,
  conservationVaultAddress,
  evidenceHash,
  verifiedAt,
} = {}) {
  const values = [campaignId, founderUserId, vaultAddress, conservationVaultAddress, evidenceHash, verifiedAt]
    .map((value) => String(value ?? '').trim());
  if (!values[0] || !/^\d+$/.test(values[1]) || !WALLET.test(values[2])
    || !WALLET.test(values[3]) || !HASH.test(values[4]) || !Number.isFinite(Date.parse(values[5]))) {
    throw new Error('invalid funding evidence identity');
  }
  return createHash('sha256').update(values.join(':')).digest('hex');
}

export function buildFundingEvidencePacket({
  campaignId = 'bond-the-duck-2026',
  founderUserId,
  vaultAddress,
  vaultBaseUnits = BOND_FUNDING_BASE_UNITS,
  observedVaultBaseUnits,
  squadsApprovalThreshold = BOND_SQUADS_APPROVAL_THRESHOLD,
  squadsMemberCount = BOND_SQUADS_MEMBER_COUNT,
  topContributorPrizeLamports = BOND_TOP_CONTRIBUTOR_LAMPORTS,
  conservationContributionLamports = BOND_CONSERVATION_CONTRIBUTION_LAMPORTS,
  totalSolCommitmentLamports = BOND_TOTAL_SOL_COMMITMENT_LAMPORTS,
  conservationVaultAddress,
  conservationAttribution = 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY',
  evidenceUrl,
  evidenceHash,
  verifiedAt,
  now = new Date(),
} = {}) {
  const reasons = [];
  const normalizedCampaignId = String(campaignId || '').trim();
  const founder = String(founderUserId || '').trim();
  const vault = String(vaultAddress || '').trim();
  const amount = String(vaultBaseUnits ?? '').trim();
  const observedAmount = String(observedVaultBaseUnits ?? '').trim();
  const prize = String(topContributorPrizeLamports ?? '').trim();
  const conservation = String(conservationContributionLamports ?? '').trim();
  const totalSol = String(totalSolCommitmentLamports ?? '').trim();
  const conservationVault = String(conservationVaultAddress || '').trim();
  const attribution = String(conservationAttribution || '').trim();
  const evidence = httpsUrl(evidenceUrl);
  const hash = String(evidenceHash || '').trim();
  const verified = new Date(verifiedAt);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const verifiedMs = verified.getTime();

  if (normalizedCampaignId !== 'bond-the-duck-2026') reasons.push('campaign identity is not Bond the Duck');
  if (!/^\d+$/.test(founder)) reasons.push('authorized founder Telegram ID is required');
  if (!WALLET.test(vault)) reasons.push('valid Squads vault address is required');
  if (amount !== BOND_FUNDING_BASE_UNITS) reasons.push('campaign vault commitment must be exactly 17,500,000 FAWKQ');
  if (!/^\d+$/.test(observedAmount)) {
    reasons.push('current on-chain vault balance is required');
  } else if (BigInt(observedAmount) < BigInt(BOND_FUNDING_BASE_UNITS)) {
    reasons.push('current on-chain vault balance is below the 17,500,000 FAWKQ commitment');
  }
  if (Number(squadsApprovalThreshold) !== BOND_SQUADS_APPROVAL_THRESHOLD) reasons.push('Squads approval threshold must be 2');
  if (Number(squadsMemberCount) !== BOND_SQUADS_MEMBER_COUNT) reasons.push('Squads member count must be 3');
  if (prize !== BOND_TOP_CONTRIBUTOR_LAMPORTS) reasons.push('top contributor prize must be exactly 1 SOL');
  if (conservation !== BOND_CONSERVATION_CONTRIBUTION_LAMPORTS) reasons.push('conservation contribution must be exactly 0.10 SOL');
  if (totalSol !== BOND_TOTAL_SOL_COMMITMENT_LAMPORTS) reasons.push('total SOL impact commitment must be exactly 1.10 SOL');
  if (!WALLET.test(conservationVault)) reasons.push('valid Ocean Conservation vault address is required');
  if (attribution !== 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY') reasons.push('conservation attribution must use the public campaign identity');
  if (!evidence) reasons.push('HTTPS funding evidence URL is required');
  if (!HASH.test(hash)) reasons.push('funding evidence SHA-256 is required');
  if (!Number.isFinite(verifiedMs)) reasons.push('valid funding verification timestamp is required');
  if (!Number.isFinite(nowMs)) reasons.push('valid audit time is required');
  if (Number.isFinite(verifiedMs) && Number.isFinite(nowMs)) {
    if (verifiedMs > nowMs + 5 * 60 * 1000) reasons.push('funding verification timestamp is future-dated');
    if (nowMs - verifiedMs > BOND_FUNDING_MAX_AGE_MS) reasons.push('funding evidence is older than 72 hours');
  }

  const ready = reasons.length === 0;
  const verifiedIso = Number.isFinite(verifiedMs) ? verified.toISOString() : null;
  const proposal = ready ? {
    p_campaign_id: normalizedCampaignId,
    p_founder_user_id: Number(founder),
    p_vault_address: vault,
    p_conservation_vault_address: conservationVault,
    p_evidence_url: evidence,
    p_evidence_hash: hash,
    p_verified_at: verifiedIso,
    p_idempotency_key: fundingProposalIdempotencyKey({
      campaignId: normalizedCampaignId,
      founderUserId: founder,
      vaultAddress: vault,
      conservationVaultAddress: conservationVault,
      evidenceHash: hash,
      verifiedAt: verifiedIso,
    }),
  } : null;

  const fingerprintMaterial = {
    campaignId: normalizedCampaignId,
    founderUserId: founder || null,
    vaultAddress: vault || null,
    vaultBaseUnits: amount || null,
    observedVaultBaseUnits: observedAmount || null,
    squadsApprovalThreshold: Number(squadsApprovalThreshold),
    squadsMemberCount: Number(squadsMemberCount),
    topContributorPrizeLamports: prize || null,
    conservationContributionLamports: conservation || null,
    totalSolCommitmentLamports: totalSol || null,
    conservationVaultAddress: conservationVault || null,
    conservationAttribution: attribution || null,
    evidenceUrl: evidence,
    evidenceHash: HASH.test(hash) ? hash : null,
    verifiedAt: verifiedIso,
    ready,
    reasons,
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(fingerprintMaterial))
    .digest('hex');

  return {
    ready,
    reasons,
    fingerprint,
    evidence: {
      campaignId: normalizedCampaignId,
      founderUserId: founder || null,
      vaultAddress: vault || null,
      vaultBaseUnits: amount || null,
      observedVaultBaseUnits: observedAmount || null,
      squadsApprovalThreshold: Number(squadsApprovalThreshold),
      squadsMemberCount: Number(squadsMemberCount),
      topContributorPrizeLamports: prize || null,
      conservationContributionLamports: conservation || null,
      totalSolCommitmentLamports: totalSol || null,
      conservationVaultAddress: conservationVault || null,
      conservationAttribution: attribution || null,
      evidenceUrl: evidence,
      evidenceHash: HASH.test(hash) ? hash : null,
      verifiedAt: verifiedIso,
    },
    proposal,
    mutationsPerformed: false,
  };
}


export function fundingProposalSubmissionEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_FUNDING_PROPOSAL_SUBMISSION_ENABLED);
}

export async function submitFundingEvidenceProposal(client, input = {}) {
  const env = input.env ?? process.env;
  if (!fundingProposalSubmissionEnabled(env)) {
    throw new Error('campaign funding proposal submission disabled');
  }
  const packet = buildFundingEvidencePacket(input);
  if (!packet.ready || !packet.proposal) {
    throw new Error(`funding evidence packet is not ready: ${packet.reasons.join('; ')}`);
  }
  const result = await client.rpc('submit_campaign_funding_proposal', packet.proposal);
  const row = Array.isArray(result) ? result[0] ?? null : result;
  if (!row) throw new Error('funding proposal was not recorded');
  return { proposal: row, packetFingerprint: packet.fingerprint };
}
