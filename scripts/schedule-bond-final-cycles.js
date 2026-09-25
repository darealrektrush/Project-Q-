import 'dotenv/config';

import { supabase } from '../src/lib/supabase.js';

const rulesHash = String(process.env.BOND_FINAL_RULES_HASH || '').trim();
if (process.env.BOND_FINAL_SCHEDULE_ACK !== 'SCHEDULE_FINAL_FIVE_CYCLES'
  || !/^[0-9a-f]{64}$/.test(rulesHash)) {
  console.error('Exact finalized BOND_FINAL_RULES_HASH and BOND_FINAL_SCHEDULE_ACK are required');
  process.exitCode = 1;
} else {
  try {
    const result = await supabase.rpc('schedule_bond_final_cycles', {
      p_campaign_id: 'bond-the-duck-2026',
      p_rules_hash: rulesHash,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Bond final schedule failed:', error.message);
    process.exitCode = 1;
  }
}
