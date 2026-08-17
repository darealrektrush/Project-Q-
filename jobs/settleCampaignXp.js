import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';
import { DEFAULT_CAMPAIGN_ID } from '../src/campaign/service.js';
import { settleCampaignRaidXp } from '../src/campaign/xpSettlement.js';

async function main() {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
  const { settled, skipped } = await settleCampaignRaidXp(supabase, campaignId);

  if (skipped) {
    console.log(`Campaign XP settlement skipped for ${campaignId}: ${skipped}.`);
    return;
  }

  const credited = settled.filter((row) => row.credited);
  const capped = settled.filter((row) => !row.credited);
  const totalXp = credited.reduce((sum, row) => sum + row.amount, 0);
  console.log(
    `Campaign XP settlement for ${campaignId}: ${settled.length} pending raid event(s) reviewed, ` +
      `${credited.length} credited (${totalXp} XP total), ${capped.length} held for daily-cap reasons.`
  );
}

main().catch((err) => {
  console.error('Campaign XP settlement failed', err);
  process.exitCode = 1;
});
