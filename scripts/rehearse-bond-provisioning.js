import { readFile } from 'node:fs/promises';
import { inspectBondCampaignRules } from '../src/campaign/rules.js';

const rules = JSON.parse(await readFile(
  new URL('../config/bond-the-duck-rules-v1.json', import.meta.url),
  'utf8'
));
const inspection = inspectBondCampaignRules(rules);

console.log(JSON.stringify({
  campaignId: rules.campaignId,
  rulesetVersion: rules.rulesetVersion,
  rulesStatus: rules.status,
  rulesHash: inspection.rulesHash,
  provisionableAsDraft: true,
  launchReady: inspection.valid,
  unresolvedFounderDecisions: inspection.blockers,
  mutationsPerformed: false,
}, null, 2));
