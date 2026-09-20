import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';

import { supabase } from '../src/lib/supabase.js';
import { getCampaignReadiness } from '../src/campaign/service.js';
import { getVerificationSourceCertificationState } from '../src/campaign/sourceCertifications.js';
import { buildBondRegistryEvidence } from '../src/campaign/registryEvidence.js';

const CAMPAIGN_ID = process.env.BOND_THE_DUCK_CAMPAIGN_ID || 'bond-the-duck-2026';

async function loadJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

async function latestLocalMigration() {
  const names = (await readdir(new URL('../supabase/migrations/', import.meta.url)))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  return names.at(-1)?.replace(/\.sql$/, '') || null;
}

async function main() {
  const [campaignRows, rules, appConfig, sourceState, readiness, migration] = await Promise.all([
    supabase.select(
      'campaigns',
      `?id=eq.${encodeURIComponent(CAMPAIGN_ID)}&select=id,state,rules_hash,ruleset_version,registry_version,funded_base_units&limit=1`
    ),
    loadJson('../config/bond-the-duck-rules-v1.json'),
    loadJson('../public/campaign-app/campaigns/bond-the-duck-2026.json'),
    getVerificationSourceCertificationState(supabase, CAMPAIGN_ID),
    getCampaignReadiness(supabase),
    latestLocalMigration(),
  ]);

  const campaign = campaignRows[0] || { id: CAMPAIGN_ID };
  const report = buildBondRegistryEvidence({
    campaign,
    rules,
    appConfig,
    sourceState,
    latestMigration: migration,
    readiness,
    deployedCommitSha: process.env.PROJECT_Q_DEPLOYED_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || null,
    projectQUrl: process.env.PROJECT_Q_PUBLIC_URL || 'https://project-q-8k3a.onrender.com',
    env: process.env,
  });

  const grouped = Object.groupBy(report.fields, ({ status }) => status);
  console.log(JSON.stringify({
    campaignId: report.campaignId,
    complete: report.complete,
    proven: report.provenCount,
    required: report.requiredCount,
    registryHash: report.registryHash,
    reportHash: report.reportHash,
    statusCounts: Object.fromEntries(
      Object.entries(grouped).map(([status, rows]) => [status, rows.length])
    ),
    fields: report.fields,
    mutationsPerformed: false,
  }, null, 2));

  if (!report.complete) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Bond registry audit failed:', error);
  process.exitCode = 1;
});
