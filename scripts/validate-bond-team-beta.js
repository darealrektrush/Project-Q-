import { readFile } from 'node:fs/promises';

import { evaluateTeamBetaEvidence } from '../src/campaign/launchQualification.js';

const path = process.argv[2] || process.env.BOND_TEAM_BETA_EVIDENCE_FILE;

if (!path) {
  console.error('Usage: npm run validate:bond-team-beta -- <evidence.json>');
  process.exit(1);
}

try {
  const evidence = JSON.parse(await readFile(path, 'utf8'));
  const result = evaluateTeamBetaEvidence(evidence);
  console.log(JSON.stringify({
    schema: 'bond-team-beta-validation-v1',
    evidenceFile: path,
    ...result,
  }, null, 2));
  if (!result.ready) process.exitCode = 2;
} catch (error) {
  console.error('Bond team beta validation failed:', error.message);
  process.exitCode = 1;
}
