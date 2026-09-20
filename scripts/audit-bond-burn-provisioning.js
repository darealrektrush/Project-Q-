import 'dotenv/config';

import { supabase } from '../src/lib/supabase.js';
import { auditBondBurnProvisioning } from '../src/earnToBurn/provisioningAudit.js';

const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';

async function main() {
  const [campaignRows, rulesets, programs] = await Promise.all([
    supabase.select('campaigns', `?id=eq.${encodeURIComponent(campaignId)}&select=id,state,rules_hash,ruleset_version&limit=1`),
    supabase.select('ruleset_versions', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=campaign_id,version,rules_json,rules_hash&order=version.desc&limit=20`),
    supabase.select('earn_to_burn_programs', `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id,campaign_id,state,mint,token_program_id,decimals,rules_hash,hard_cap_base_units,max_single_burn_base_units&limit=1`),
  ]);

  const campaign=campaignRows[0]||null;
  const ruleset=rulesets.find(({version})=>Number(version)===Number(campaign?.ruleset_version))||null;
  const program=programs[0]||null;
  const [sourceAccounts, founders, milestones]=program ? await Promise.all([
    supabase.select('burn_source_accounts', `?program_id=eq.${encodeURIComponent(program.id)}&select=token_account,source_type,approved,evidence_url,verified_at`),
    supabase.select('burn_program_founders', `?program_id=eq.${encodeURIComponent(program.id)}&select=founder_user_id`),
    supabase.select('burn_milestones', `?program_id=eq.${encodeURIComponent(program.id)}&select=id,sequence,progress_target_units,burn_amount_base_units,burn_type,state,rules_hash&order=sequence.asc`),
  ]) : [[],[],[]];

  const audit=auditBondBurnProvisioning({campaign,ruleset,program,sourceAccounts,founders,milestones});
  console.log(JSON.stringify(audit,null,2));
  if(!audit.ready) process.exitCode=2;
}

main().catch((error)=>{
  console.error('Bond burn provisioning audit failed:',error);
  process.exitCode=1;
});
