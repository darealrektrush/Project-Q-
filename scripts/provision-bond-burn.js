import 'dotenv/config';

import { supabase } from '../src/lib/supabase.js';
import { provisionBondEarnToBurn } from '../src/earnToBurn/provisioning.js';

async function main() {
  const result = await provisionBondEarnToBurn(supabase, {
    campaignId: process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026',
    sourceEvidenceUrl: process.env.BOND_BURN_SOURCE_EVIDENCE_URL,
    sourceVerifiedAt: process.env.BOND_BURN_SOURCE_VERIFIED_AT,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Bond Earn-to-Burn provisioning failed:', error.message);
  process.exitCode = 1;
});
