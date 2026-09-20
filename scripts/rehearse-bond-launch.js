import 'dotenv/config';
import { readFile } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { getCampaignReadiness } from '../src/campaign/service.js';
import { getFundingGovernanceState } from '../src/campaign/fundingGovernance.js';
import { auditBondBurnProvisioning } from '../src/earnToBurn/provisioningAudit.js';
import { buildBondRulesReconciliation } from '../src/campaign/rulesReconciliation.js';
import { buildBondLaunchRehearsal } from '../src/campaign/launchRehearsal.js';

const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';

async function loadBurnState(campaign) {
  const programs = await supabase.select(
    'earn_to_burn_programs',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id,campaign_id,state,mint,token_program_id,decimals,rules_hash,hard_cap_base_units,max_single_burn_base_units&limit=1`
  );
  const program = programs[0] || null;
  if (!program) return { program:null, sourceAccounts:[], founders:[], milestones:[] };
  const [sourceAccounts, founders, milestones] = await Promise.all([
    supabase.select('burn_source_accounts', `?program_id=eq.${encodeURIComponent(program.id)}&select=token_account,source_type,approved,evidence_url,verified_at`),
    supabase.select('burn_program_founders', `?program_id=eq.${encodeURIComponent(program.id)}&select=founder_user_id`),
    supabase.select('burn_milestones', `?program_id=eq.${encodeURIComponent(program.id)}&select=id,sequence,progress_target_units,burn_amount_base_units,burn_type,state,rules_hash&order=sequence.asc`),
  ]);
  return { program, sourceAccounts, founders, milestones };
}

async function countRows(table, query) {
  const rows = await supabase.select(table, query);
  return rows.length;
}

async function main() {
  const [campaignRows, liveRulesets, readiness, funding, reviewedDraft] = await Promise.all([
    supabase.select('campaigns', `?id=eq.${encodeURIComponent(campaignId)}&select=id,state,rules_hash,ruleset_version,registry_version,funded_base_units&limit=1`),
    supabase.select('ruleset_versions', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=campaign_id,version,rules_json,rules_hash&order=version.asc`),
    getCampaignReadiness(supabase, process.env),
    getFundingGovernanceState(supabase, campaignId),
    readFile(new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);
  const campaign = campaignRows[0] || null;
  const burnState = await loadBurnState(campaign);
  const burnAudit = auditBondBurnProvisioning({
    campaign,
    ruleset: liveRulesets.find(({version})=>Number(version)===Number(campaign?.ruleset_version)) || null,
    ...burnState,
  });
  const rulesAudit = buildBondRulesReconciliation({
    campaign,
    liveRulesets,
    repoRules: reviewedDraft,
  });

  const [
    cycles, drawCutoffs, drawFinalizations, winners, allocations,
    impactReceipts, topContributorFinalizations,
  ] = await Promise.all([
    countRows('cycles', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=cycle_id&limit=10`),
    countRows('campaign_cycle_draw_cutoffs', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=cycle_id&limit=10`),
    countRows('campaign_cycle_draw_finalizations', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=cycle_id&limit=10`),
    countRows('cycle_winners', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=cycle_id&limit=100`),
    countRows('allocations', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id&limit=500`),
    countRows('campaign_impact_receipts', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id&limit=10`),
    countRows('campaign_top_contributor_finalizations', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=campaign_id&limit=2`),
  ]);

  const report = buildBondLaunchRehearsal({
    campaign,
    readiness,
    funding,
    burnAudit,
    rulesAudit,
    counts: {
      cycles, drawCutoffs, drawFinalizations, winners, allocations,
      impactReceipts, topContributorFinalizations,
    },
    env: process.env,
  });

  console.log(JSON.stringify(report, null, 2));
  if (!report.integritySafe) process.exitCode = 1;
  else if (!report.launchReady) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Bond launch rehearsal failed:', error.message);
  process.exitCode = 1;
});
