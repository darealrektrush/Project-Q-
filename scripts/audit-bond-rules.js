import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { buildBondRulesReconciliation } from '../src/campaign/rulesReconciliation.js';

const CAMPAIGN_ID = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';

async function main() {
  const [campaignRows, liveRulesets, repoRules] = await Promise.all([
    supabase.select(
      'campaigns',
      `?id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=id,state,rules_hash,ruleset_version&limit=1`
    ),
    supabase.select(
      'ruleset_versions',
      `?campaign_id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=campaign_id,version,rules_json,rules_hash&order=version.asc`
    ),
    readFile(new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  const report = buildBondRulesReconciliation({
    campaign: campaignRows[0] || null,
    liveRulesets,
    repoRules,
  });

  console.log(JSON.stringify(report, null, 2));
  if (!report.readyForFinalProposal) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Bond rules reconciliation audit failed:', error);
  process.exitCode = 1;
});
