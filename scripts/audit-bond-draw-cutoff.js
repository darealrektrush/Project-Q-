import 'dotenv/config';

import { supabase } from '../src/lib/supabase.js';
import { getConnection } from '../src/lib/solana.js';
import { resolveFirstFinalizedBlockAtOrAfter } from '../src/campaign/cycleDrawOperations.js';

const CAMPAIGN_ID = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';
const CYCLE_ID = Number(process.env.BOND_DRAW_CYCLE_ID);

async function main() {
  if (!Number.isInteger(CYCLE_ID) || CYCLE_ID < 1 || CYCLE_ID > 5) {
    throw new Error('BOND_DRAW_CYCLE_ID must be an integer from 1 through 5');
  }

  const rows = await supabase.select(
    'cycles',
    `?campaign_id=eq.${encodeURIComponent(CAMPAIGN_ID)}&cycle_id=eq.${CYCLE_ID}` +
      '&select=cycle_id,closes_at,cutoff_slot,cutoff_blockhash&limit=1'
  );
  const cycle = rows[0] || null;
  if (!cycle) throw new Error('campaign cycle not found');
  if (cycle.cutoff_slot || cycle.cutoff_blockhash) {
    throw new Error('cycle cutoff is already recorded');
  }

  const evidence = await resolveFirstFinalizedBlockAtOrAfter(
    getConnection(),
    cycle.closes_at
  );

  console.log(JSON.stringify({
    campaignId: CAMPAIGN_ID,
    cycleId: CYCLE_ID,
    ...evidence,
    mutationsPerformed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error('Bond cutoff audit failed:', error.message);
  process.exitCode = 1;
});
