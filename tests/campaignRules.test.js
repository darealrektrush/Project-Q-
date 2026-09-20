import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BOND_DRAW_POLICY,
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
    schedule: {
      ...rules.schedule,
      activeOpensAt: '2026-10-01T15:00:00.000Z',
      activeClosesAt: '2026-10-11T15:00:00.000Z',
      reviewOpensAt: '2026-10-12T15:00:00.000Z',
      review48HourCheckpointAt: '2026-10-14T15:00:00.000Z',
      reviewClosesAt: '2026-10-15T15:00:00.000Z',
    },
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
    buyToEarn: {
      ...rules.buyToEarn,
      status: 'FINAL',
      mode: 'WEIGHT_ONLY',
      poolBaseUnits: '0',
      fundingSource: null,
      tier1NetBuySol: 0.07,
      tier2NetBuySol: 0.20,
    },
  };
}

test('reviewed draft rules lock campaign economics but remain launch-blocked', async () => {
  const rules = await readDraft();
  const draft = inspectBondCampaignRules(rules);
  assert.equal(draft.valid, false);
  assert.match(draft.rulesHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(rules.missions, BOND_RULES_MISSION_IDS);
  assert.deepEqual(draft.blockers, [
    'ruleset status is not FINAL',
    'Buy-to-Earn economic mode is not finalized',
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
  assert.deepEqual(rules.draw, campaign.draw);
  assert.deepEqual(rules.draw, BOND_DRAW_POLICY);
  assert.deepEqual(rules.buyToEarn, campaign.buyToEarn);
  assert.equal(rules.buyToEarn.status, 'PENDING_ECONOMIC_MODE');
  assert.equal(rules.buyToEarn.mode, null);
  assert.equal(rules.buyToEarn.tier1NetBuySol, 0.07);
  assert.equal(rules.buyToEarn.tier2NetBuySol, 0.20);
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
  assert.equal(inspectBondCampaignRules({
    ...ready,
    draw: { ...ready.draw, revealAffectsSeed: true },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    draw: { ...ready.draw, weightedDrawPool: 'ALL_ELIGIBLE' },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    draw: { ...ready.draw, priorWinnerCooldownCycles: 0 },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    buyToEarn: { ...ready.buyToEarn, mode: null },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    buyToEarn: { ...ready.buyToEarn, poolBaseUnits: '7500000000000' },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    buyToEarn: {
      ...ready.buyToEarn,
      mode: 'SEPARATE_POOL',
      poolBaseUnits: '7500000000000',
      fundingSource: '',
    },
  }).valid, false);
  assert.equal(inspectBondCampaignRules({
    ...ready,
    buyToEarn: {
      ...ready.buyToEarn,
      mode: 'SEPARATE_POOL',
      poolBaseUnits: '7500000000000',
      fundingSource: 'SEPARATE_VERIFIED_VAULT',
    },
  }).valid, true);
});

test('database rules gate requires matching final JSON, version and hash', async () => {
  const rules = finalized(await readDraft());
  const inspection = inspectBondCampaignRules(rules);
  const campaign = { ruleset_version: 5, rules_hash: inspection.rulesHash };
  const row = { version: 5, rules_hash: inspection.rulesHash, rules_json: rules };
  assert.equal(rulesetRowMatchesCampaign(campaign, row), true);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, version: 4 }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, {
    ...row,
    rules_json: { ...rules, rulesetVersion: 6 },
  }), false);
  assert.equal(rulesetRowMatchesCampaign(campaign, { ...row, rules_hash: 'a'.repeat(64) }), false);
});
