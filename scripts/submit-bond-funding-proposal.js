import 'dotenv/config';

import { supabase } from '../src/lib/supabase.js';
import { submitFundingEvidenceProposal } from '../src/campaign/fundingEvidence.js';

async function main() {
  const result = await submitFundingEvidenceProposal(supabase, {
    campaignId: process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026',
    founderUserId: process.env.BOND_FUNDING_PROPOSER_TELEGRAM_ID,
    vaultAddress: process.env.BOND_SQUADS_VAULT_PUBLIC,
    vaultBaseUnits: process.env.BOND_SQUADS_VAULT_BASE_UNITS || '17500000000000',
    observedVaultBaseUnits: process.env.BOND_SQUADS_VAULT_OBSERVED_BASE_UNITS,
    squadsApprovalThreshold: process.env.BOND_SQUADS_APPROVAL_THRESHOLD || 2,
    squadsMemberCount: process.env.BOND_SQUADS_MEMBER_COUNT || 3,
    topContributorPrizeLamports: process.env.BOND_TOP_CONTRIBUTOR_PRIZE_LAMPORTS || '1000000000',
    conservationContributionLamports: process.env.BOND_CONSERVATION_CONTRIBUTION_LAMPORTS || '100000000',
    totalSolCommitmentLamports: process.env.BOND_TOTAL_SOL_COMMITMENT_LAMPORTS || '1100000000',
    conservationVaultAddress: process.env.BOND_OCEAN_CONSERVATION_VAULT,
    conservationAttribution: process.env.BOND_CONSERVATION_ATTRIBUTION || 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY',
    evidenceUrl: process.env.BOND_FUNDING_EVIDENCE_URL,
    evidenceHash: process.env.BOND_FUNDING_EVIDENCE_SHA256,
    verifiedAt: process.env.BOND_FUNDING_VERIFIED_AT,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Bond funding proposal submission failed:', error.message);
  process.exitCode = 1;
});
