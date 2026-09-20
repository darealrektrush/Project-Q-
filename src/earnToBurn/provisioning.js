import { isEnabled } from '../lib/featureFlags.js';

export function burnProvisioningEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_BURN_PROVISIONING_ENABLED);
}

export async function provisionBondEarnToBurn(client, {
  campaignId = 'bond-the-duck-2026',
  sourceEvidenceUrl,
  sourceVerifiedAt,
  env = process.env,
} = {}) {
  if (!burnProvisioningEnabled(env)) throw new Error('Bond burn provisioning is disabled');
  if (!/^https:\/\//i.test(String(sourceEvidenceUrl || ''))) {
    throw new Error('creator-wallet source evidence URL is required');
  }
  const verifiedAt = new Date(sourceVerifiedAt);
  if (!Number.isFinite(verifiedAt.getTime())) throw new Error('valid source verification timestamp is required');

  const result = await client.rpc('provision_bond_earn_to_burn', {
    p_campaign_id: campaignId,
    p_source_evidence_url: String(sourceEvidenceUrl),
    p_source_verified_at: verifiedAt.toISOString(),
  });
  return Array.isArray(result) ? result[0] ?? null : result;
}
