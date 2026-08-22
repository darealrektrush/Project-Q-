import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';
import { DEFAULT_CAMPAIGN_ID } from '../src/campaign/service.js';
import { settleCampaignRaidXp } from '../src/campaign/xpSettlement.js';
import { settleCampaignParticipationXp } from '../src/campaign/participationSettlement.js';

async function main() {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
  if (process.env.PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED !== 'true') {
    console.log(`Campaign XP settlement disabled for ${campaignId}.`);
    return;
  }

  const raidResult = await settleCampaignRaidXp(supabase, campaignId);
  const participationResult = await settleCampaignParticipationXp(supabase, campaignId);
  const settled = [...raidResult.settled, ...participationResult.settled];
  const skipped = raidResult.skipped ?? participationResult.skipped;

  if (skipped) {
    console.log(`Campaign XP settlement skipped for ${campaignId}: ${skipped}.`);
    return;
  }

  const credited = settled.filter((row) => row.credited);
  const capped = settled.filter((row) => !row.credited);
  const totalXp = credited.reduce((sum, row) => sum + row.amount, 0);
  console.log(
    `Campaign XP settlement for ${campaignId}: ${settled.length} pending event(s) reviewed, ` +
      `${credited.length} credited (${totalXp} XP total), ${capped.length} held for daily-cap reasons.`
  );
}

main().catch((err) => {
  console.error('Campaign XP settlement failed', err);
  process.exitCode = 1;
});
