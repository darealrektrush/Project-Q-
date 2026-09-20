import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { prepareBondFinalRulesPacket } from '../src/campaign/finalRulesPacket.js';

async function main() {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';
  const [campaignRows, draft] = await Promise.all([
    supabase.select(
      'campaigns',
      `?id=eq.${encodeURIComponent(campaignId)}&select=id,state,ruleset_version,rules_hash&limit=1`
    ),
    readFile(new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  const packet = prepareBondFinalRulesPacket({
    campaign: campaignRows[0] || null,
    reviewedDraft: draft,
    activeOpensAt: process.env.BOND_ACTIVE_OPENS_AT,
    xInviteMainPostId: process.env.FAWKQ_BOND_CAMPAIGN_POST_ID,
    now: new Date(),
  });

  console.log(JSON.stringify(packet, null, 2));
}

main().catch((error) => {
  console.error('Bond final-rules packet preparation failed:', error.message);
  process.exitCode = 1;
});
