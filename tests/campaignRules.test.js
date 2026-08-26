import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BOND_RULES_MISSION_IDS,
  inspectBondCampaignRules,
  rulesetRowMatchesCampaign,
} from '../src/campaign/rules.js';

const readDraft = async () => JSON.parse(await readFile(
  new URL('../config/bond-the-duck-rules-v1.json', import.meta.url),
  'utf8'
));

function finalized(rules) {
  return {
    ...structuredClone(rules),
    rulesetVersion: 2,
    status: 'FINAL',
    referrals: {
      ...rules.referrals,
      bonusXp: 10,
      xInviteMainPostId: '1234567890123456789',
      xInviteBonusXp: 5,
    },
    earnToBurn: {
      ...rules.earnToBurn,
      milestones: [{ id: 'opening', progressTargetUnits: '1000', burnAmountBaseUnits: '15000000000000' }],
    },
  };
}

test('reviewed draft rules lock campaign economics but remain launch-blocked', async () => {
  const rules = await readDraft();
  const draft = inspectBondCampaignRules(rules);
  assert.equal(draft.valid, false);
  assert.match(draft.rulesHash, /^[0-9a-f]{64}$/);
  assert.equal(draft.rulesHash, '67fcfcba5ee2a1a344e24df5ebcdba3db1581babb1438da0965dbba2995fd8af');
  assert.deepEqual(rules.missions, BOND_RULES_MISSION_IDS);
  assert.deepEqual(draft.blockers, [
    'ruleset status is not FINAL',
    'verified referral bonus XP is not finalized',
    'official pinned FAWKQ campaign post ID is not finalized',
    'X invite bonus XP is not finalized',
    'Earn to Burn milestones are not finalized',
  ]);
});

test('draft rules, Mini App campaign config and provisioning migration cannot drift', async () => {
  const rules = await readDraft();
  const campaign = JSON.parse(await readFile(
    new URL('../public/campaign-app/campaigns/bond-the-duck-2026.json', import.meta.url),
    'utf8'
  ));
  const migration = await readFile(
    new URL('../supabase/migrations/20260825231000_provision_bond_the_duck_draft.sql', import.meta.url),
    'utf8'
  );
  const inspection = inspectBondCampaignRules(rules);
  const embeddedRulesMatch = migration.match(/\$rules\$\s*([\s\S]*?)\s*\$rules\$::jsonb/);

  assert.ok(embeddedRulesMatch, 'provisioning migration must embed the reviewed rules JSON');
  assert.deepEqual(JSON.parse(embeddedRulesMatch[1]), rules);
  assert.equal(rules.schedule.activeOpensAt, campaign.schedule.activeOpensAt);
  assert.equal(rules.schedule.activeClosesAt, campaign.schedule.activeClosesAt);
  assert.equal(rules.schedule.reviewClosesAt, campaign.schedule.reviewClosesAt);
  assert.deepEqual(rules.missions, campaign.missions.map(({ id }) => id));
  assert.equal(rules.commitments.campaignRewardsBaseUnits,
    campaign.campaignCommitments.campaignRewards.amountBaseUnits);
  assert.equal(rules.commitments.diamondDuckBaseUnits,
    campaign.campaignCommitments.diamondDuckBonus.amountBaseUnits);
  assert.equal(rules.commitments.topContributorLamports,
    campaign.campaignCommitments.topContributorPrize.amountLamports);
  assert.equal(rules.commitments.earnToBurnBaseUnits,
    campaign.campaignCommitments.earnToBurn.amountBaseUnits);
  assert.equal(rules.referrals.bonusXp, campaign.referrals.bonusXp);
  assert.equal(rules.referrals.xInviteMainPostId, campaign.referrals.xInviteBonus.mainPostId);
  assert.deepEqual(rules.verificationSources, campaign.verificationSources);
  assert.match(migration, new RegExp(inspection.rulesHash));
});

test('final rules require exact locked commitments, schedule and nine mission lanes', async () => {
  const ready = finalized(await readDraft());
  assert.equal(inspectBondCampaignRules(ready).valid, true);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    commitments: { ...ready.commitments, topContributorLamports: '0' },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    missions: ready.missions.filter((id) => id !== 'bagwork'),
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    earnToBurn: {
      ...ready.earnToBurn,
      milestones: [{ id: 'opening', progressTargetUnits: '1000', burnAmountBaseUnits: '1' }],
    },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    verificationSources: {
      ...ready.verificationSources,
      telegramBots: ready.verificationSources.telegramBots.slice(0, 4),
    },
  }).valid, false);
});

test('database rules gate requires matching final JSON, version and hash', async () => {
  const rules = finalized(await readDraft());
  const inspection = inspectBondCampaignRules(rules);
  const campaign = { ruleset_version: 2, rules_hash: inspection.rulesHash };
  const row = { version: 2, rules_hash: inspection.rulesHash, rules_json: rules };
  assert.equal(rulesetRowMatchesCampaign(campaign, row), true);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, version: 1 }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, {
    ...row,
    rules_json: { ...rules, rulesetVersion: 3 },
  }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, rules_hash: 'a'.repeat(64) }), false);
});
