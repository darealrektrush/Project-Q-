import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import {
  buildSourceCertificationPackets,
  summarizeSourceCertificationPackets,
} from '../src/campaign/sourceCertificationPackets.js';

const CAMPAIGN_ID = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';
const evidencePath = process.env.BOND_SOURCE_CERTIFICATION_EVIDENCE_PATH;

async function loadEvidence() {
  if (!evidencePath) return [];
  const content = await readFile(evidencePath, 'utf8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error('source certification evidence file must be a JSON array');
  return parsed;
}

async function main() {
  const founderUserId = process.env.BOND_SOURCE_CERTIFIER_TELEGRAM_ID;
  if (!founderUserId) throw new Error('BOND_SOURCE_CERTIFIER_TELEGRAM_ID is required');

  const [sources, evidence] = await Promise.all([
    supabase.select(
      'verification_sources',
      `?campaign_id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=campaign_id,source_key,source,classification,target_url&order=source.asc,source_key.asc`
    ),
    loadEvidence(),
  ]);

  const packets = buildSourceCertificationPackets(sources, evidence, {
    campaignId: CAMPAIGN_ID,
    founderUserId,
    checkedAt: new Date(),
  });
  const summary = summarizeSourceCertificationPackets(packets);

  console.log(JSON.stringify({
    campaignId: CAMPAIGN_ID,
    ...summary,
    packets,
    mutationsPerformed: false,
  }, null, 2));

  if (!summary.complete) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Bond source certification packet audit failed:', error);
  process.exitCode = 1;
});
