import 'dotenv/config';

import { buildFundingEvidencePacket } from '../src/campaign/fundingEvidence.js';

function main() {
  const packet = buildFundingEvidencePacket({
    campaignId: process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026',
    founderUserId: process.env.BOND_FUNDING_PROPOSER_TELEGRAM_ID,
    vaultAddress: process.env.BOND_SQUADS_VAULT_PUBLIC,
    vaultBaseUnits: process.env.BOND_SQUADS_VAULT_BASE_UNITS || '17500000000000',
    squadsApprovalThreshold: process.env.BOND_SQUADS_APPROVAL_THRESHOLD || 2,
    squadsMemberCount: process.env.BOND_SQUADS_MEMBER_COUNT || 3,
    topContributorPrizeLamports: process.env.BOND_TOP_CONTRIBUTOR_PRIZE_LAMPORTS || '1000000000',
    evidenceUrl: process.env.BOND_FUNDING_EVIDENCE_URL,
    evidenceHash: process.env.BOND_FUNDING_EVIDENCE_SHA256,
    verifiedAt: process.env.BOND_FUNDING_VERIFIED_AT,
    now: new Date(),
  });

  console.log(JSON.stringify(packet, null, 2));
  if (!packet.ready) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error('Bond funding evidence audit failed:', error);
  process.exitCode = 1;
}
