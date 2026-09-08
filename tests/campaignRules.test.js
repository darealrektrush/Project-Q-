import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BOND_EARN_TO_BURN_MILESTONES,
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
    rulesetVersion: rules.rulesetVersion + 1,
    status: 'FINAL',
    referrals: {
      ...rules.referrals,
      bonusXp: 10,
      xInviteMainPostId: '1234567890123456789',
      xInviteBonusXp: 5,
    },
    earnToBurn: {
      ...rules.earnToBurn,
      milestones: structuredClone(BOND_EARN_TO_BURN_MILESTONES),
    },
  };
}

test('reviewed draft rules lock campaign economics but remain launch-blocked', async () => {
  const rules = await readDraft();
  const draft = inspectBondCampaignRules(rules);
  assert.equal(draft.valid, false);
  assert.match(draft.rulesHash, /^[0-9a-f]{64}$/);
  assert.equal(draft.rulesHash, '8dc6afbee14105515e330ac0a965f3746c094d07aa5c3f2c0e08b052742af0ee');
  assert.deepEqual(rules.missions, BOND_RULES_MISSION_IDS);
  assert.deepEqual(draft.blockers, [
    'ruleset status is not FINAL',
    'official pinned FAWKQ campaign post ID is not finalized',
  ]);
});

test('current draft rules and Mini App campaign config cannot drift', async () => {
  const rules = await readDraft();
  const campaign = JSON.parse(await readFile(
    new URL('../public/campaign-app/campaigns/bond-the-duck-2026.json', import.meta.url),
    'utf8'
  ));
  assert.equal(rules.schedule.activeOpensAt, campaign.schedule.activeOpensAt);
  assert.equal(rules.schedule.activeClosesAt, campaign.schedule.activeClosesAt);
  assert.equal(rules.schedule.reviewClosesAt, campaign.schedule.reviewClosesAt);
  assert.deepEqual(rules.missions, campaign.missions.map(({ id }) => id));
  assert.equal(rules.commitments.campaignRewardsBaseUnits,
    campaign.campaignCommitments.campaignRewards.amountBaseUnits);
  assert.equal(rules.commitments.diamondDuckBaseUnits,
    campaign.campaignCommitments.diamondDuckBonus.amountBaseUnits);
  assert.equal(rules.commitments.squadsCommunityVaultBaseUnits,
    campaign.campaignCommitments.squadsCommunityVault.amountBaseUnits);
  assert.equal(rules.commitments.squadsApprovalThreshold,
    campaign.campaignCommitments.squadsCommunityVault.approvalThreshold);
  assert.equal(rules.commitments.squadsMemberCount,
    campaign.campaignCommitments.squadsCommunityVault.memberCount);
  assert.equal(rules.commitments.topContributorLamports,
    campaign.campaignCommitments.topContributorPrize.amountLamports);
  assert.equal(rules.commitments.earnToBurnBaseUnits,
    campaign.campaignCommitments.earnToBurn.amountBaseUnits);
  assert.equal(rules.referrals.bonusXp, campaign.referrals.bonusXp);
  assert.equal(rules.referrals.bonusCapPolicy, campaign.referrals.bonusCapPolicy);
  assert.equal(rules.referrals.xInviteMainPostId, campaign.referrals.xInviteBonus.mainPostId);
  assert.equal(rules.referrals.xInviteBonusXp, campaign.referrals.xInviteBonus.bonusXp);
  assert.deepEqual(rules.earnToBurn.milestones, campaign.earnToBurn.milestones);
  assert.deepEqual(rules.verificationSources, campaign.verificationSources);
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
    earnToBurn: {
      ...ready.earnToBurn,
      milestones: ready.earnToBurn.milestones.map((milestone, index) =>
        index === 0 ? { ...milestone, progressTargetUnits: '1999' } : milestone
      ),
    },
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
  const campaign = { ruleset_version: 4, rules_hash: inspection.rulesHash };
  const row = { version: 4, rules_hash: inspection.rulesHash, rules_json: rules };
  assert.equal(rulesetRowMatchesCampaign(campaign, row), true);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, version: 3 }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, {
    ...row,
    rules_json: { ...rules, rulesetVersion: 5 },
  }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, rules_hash: 'a'.repeat(64) }), false);
});
