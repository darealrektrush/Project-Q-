import 'dotenv/config';
import { chmod, writeFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { prepareCycleDrawCommitmentPacket } from '../src/campaign/cycleDrawOperations.js';

const CAMPAIGN_ID = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';
const PRIVATE_OUTPUT_PATH = process.env.BOND_DRAW_PRIVATE_OUTPUT_PATH;

async function main() {
  if (!PRIVATE_OUTPUT_PATH) throw new Error('BOND_DRAW_PRIVATE_OUTPUT_PATH is required');

  const [campaignRows, cycles, commitments] = await Promise.all([
    supabase.select('campaigns', `?id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=id,state&limit=1`),
    supabase.select('cycles', `?campaign_id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=cycle_id,opens_at,closes_at&order=cycle_id.asc`),
    supabase.select('campaign_cycle_draw_commitments', `?campaign_id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=cycle_id,commit_hash`),
  ]);

  const campaign = campaignRows[0] || null;
  if (!campaign || campaign.state !== 'SCHEDULED') {
    throw new Error('Bond must be SCHEDULED before draw commitments are prepared');
  }
  if (commitments.length) {
    throw new Error('draw commitments already exist; private reveal material must not be regenerated');
  }

  const { publicPacket, privatePacket } = prepareCycleDrawCommitmentPacket(cycles, {
    campaignId: CAMPAIGN_ID,
  });

  await writeFile(PRIVATE_OUTPUT_PATH, JSON.stringify(privatePacket, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  await chmod(PRIVATE_OUTPUT_PATH, 0o600);

  console.log(JSON.stringify({
    ...publicPacket,
    privateRevealMaterialWritten: true,
    mutationsPerformed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error('Bond draw commitment preparation failed:', error.message);
  process.exitCode = 1;
});
