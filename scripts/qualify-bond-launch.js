import { readFile } from 'node:fs/promises';

import { buildBondLaunchQualification } from '../src/campaign/launchQualification.js';

async function readJson(path) {
  if (!path) return null;
  return JSON.parse(await readFile(path, 'utf8'));
}

try {
  const report = buildBondLaunchQualification({
    betaEvidence: await readJson(process.env.BOND_TEAM_BETA_EVIDENCE_FILE),
    onchainEvidence: await readJson(process.env.BOND_ONCHAIN_REHEARSAL_EVIDENCE_FILE),
    productionReadiness: await readJson(process.env.BOND_PRODUCTION_READINESS_FILE),
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 2;
} catch (error) {
  console.error('Bond launch qualification failed:', error.message);
  process.exitCode = 1;
}
