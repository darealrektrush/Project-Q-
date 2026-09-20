import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { submitSourceCertificationPacket } from '../src/campaign/sourceCertificationPackets.js';

const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';

async function loadEvidence() {
  const path = process.env.BOND_SOURCE_CERTIFICATION_EVIDENCE_PATH;
  if (!path) throw new Error('BOND_SOURCE_CERTIFICATION_EVIDENCE_PATH is required');
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('source certification evidence must be a JSON array');
  return parsed;
}

async function main() {
  const founderUserId = process.env.BOND_SOURCE_CERTIFIER_TELEGRAM_ID;
  if (!founderUserId) throw new Error('BOND_SOURCE_CERTIFIER_TELEGRAM_ID is required');

  const [sourceRows, evidenceRows] = await Promise.all([
    supabase.select(
      'verification_sources',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=campaign_id,source_key,source,classification,target_url&order=source.asc,source_key.asc`
    ),
    loadEvidence(),
  ]);

  const result = await submitSourceCertificationPacket(supabase, {
    sourceRows,
    evidenceRows,
    campaignId,
    founderUserId,
    checkedAt: new Date(),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Bond source certification packet submission failed:', error.message);
  process.exitCode = 1;
});
