import 'dotenv/config';

import { settleCommunityActivityDay, COMMUNITY_TIME_ZONE } from '../src/campaign/communityActivity.js';
import { supabase } from '../src/lib/supabase.js';

function previousLocalDay(now = new Date(), timeZone = COMMUNITY_TIME_ZONE) {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(yesterday);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function main() {
  if (process.env.PROJECT_Q_COMMUNITY_ACTIVITY_SETTLEMENT_ENABLED !== 'true') {
    console.log('Community Pulse settlement disabled.');
    return;
  }
  const localDay = process.env.COMMUNITY_ACTIVITY_LOCAL_DAY || previousLocalDay();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay)) throw new Error('invalid community activity local day');
  const results = await settleCommunityActivityDay(supabase, localDay);
  const eligible = results.filter(({ eligible }) => eligible);
  console.log(
    `Community Pulse ${localDay}: ${results.length} participant(s), ` +
    `${eligible.length} qualified, ${eligible.reduce((total, row) => total + row.baseXp + row.rankXp, 0)} XP proposed before caps.`
  );
}

main().catch((err) => {
  console.error('Community Pulse settlement failed', err);
  process.exitCode = 1;
});
