import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBondRulesReconciliation } from '../src/campaign/rulesReconciliation.js';

const liveCampaign = {
  id: 'bond-the-duck-2026',
  state: 'DRAFT',
  ruleset_version: 1,
  rules_hash: 'a'.repeat(64),
};

const liveRulesets = [{
  campaign_id: 'bond-the-duck-2026',
  version: 1,
  rules_hash: 'a'.repeat(64),
  rules_json: { rulesetVersion: 1, status: 'DRAFT' },
}];

function baseRepoRules() {
  return {
    schema: 'bond-campaign-rules-v1',
    campaignId: 'bond-the-duck-2026',
    rulesetVersion: 4,
    status: 'DRAFT',
    schedule: {
      timeZone: 'America/Vancouver',
      activeOpensAt: null,
      activeClosesAt: null,
      activeDays: 10,
      cycleHours: 48,
      cycleCount: 5,
      reviewOpensAt: null,
      review48HourCheckpointAt: null,
      reviewClosesAt: null,
    },
    eligibility: {
      telegramRequired: true,
      oracleXRequired: true,
      walletRequiredForRewards: true,
      minimumFawkqUsd: 2,
    },
    xpCaps: {
      overallDaily: 75,
      participationDaily: 15,
      projectQDaily: 20,
      trendingBotsDaily: 20,
    },
    verificationSources: {
      websiteVotingCount: 9,
      websiteVoting: [],
      telegramBotFirstDailyXp: 2,
      telegramBotRepeatXp: 1,
      telegramBotDailyMaximumXp: 20,
      telegramPushPointPerAcceptedVote: 1,
      telegramBotCooldownSeconds: {},
      telegramBotCooldownCertification: {},
      telegramBots: [],
    },
    commitments: {
      campaignRewardsBaseUnits: '15000000000000',
      diamondDuckBaseUnits: '2500000000000',
      squadsCommunityVaultBaseUnits: '17500000000000',
      campaignRewardsSource: 'SQUADS_COMMUNITY_VAULT',
      diamondDuckSource: 'SQUADS_COMMUNITY_VAULT',
      squadsApprovalThreshold: 2,
      squadsMemberCount: 3,
      unlockDependent: false,
      topContributorLamports: '1000000000',
      earnToBurnBaseUnits: '15000000000000',
      earnToBurnSource: 'FAWKQ_CREATOR_WALLET',
      totalTokenCommitmentBaseUnits: '32500000000000',
    },
    releases: {
      verifiedActivityPercent: 25,
      postReviewPercent: 50,
      phasedPercent: 25,
      phasedInstallments: 5,
      phasedInstallmentPercent: 5,
      phasedOffsetDays: [6,12,18,24,30],
    },
    missions: [
      'oracle-raids','website-voting','trending-bots','bagwork','buy-to-earn',
      'participation-xp','community-pulse','verified-referrals','earn-to-burn',
    ],
    referrals: {
      minimumPurchaseUsd: 2,
      bonusXp: 10,
      bonusCapPolicy: 'QUEUE_EXACT_UNDER_OVERALL_DAILY_CAP',
      xInviteMainPostId: null,
      xInviteRequiredDistinctMentions: 3,
      xInviteBonusXp: 5,
    },
    earnToBurn: {
      programId: 'fawkq-earn-to-burn',
      openingBurnBaseUnits: '15000000000000',
      openingBurnType: 'CREATOR_WALLET_RESERVE',
      milestones: [
        { id:'bond-burn-1',sequence:1,label:'Burn Milestone 1',progressTargetUnits:'2000',burnAmountBaseUnits:'3000000000000',burnType:'RESERVE_BURN' },
        { id:'bond-burn-2',sequence:2,label:'Burn Milestone 2',progressTargetUnits:'5000',burnAmountBaseUnits:'3000000000000',burnType:'RESERVE_BURN' },
        { id:'bond-burn-3',sequence:3,label:'Burn Milestone 3',progressTargetUnits:'9000',burnAmountBaseUnits:'3000000000000',burnType:'RESERVE_BURN' },
        { id:'bond-burn-4',sequence:4,label:'Burn Milestone 4',progressTargetUnits:'14000',burnAmountBaseUnits:'3000000000000',burnType:'RESERVE_BURN' },
        { id:'bond-burn-5',sequence:5,label:'Burn Milestone 5',progressTargetUnits:'20000',burnAmountBaseUnits:'3000000000000',burnType:'RESERVE_BURN' },
      ],
    },
  };
}

test('current repo draft remains blocked for dates, pinned X post and Buy-to-Earn economics', () => {
  const report = buildBondRulesReconciliation({
    campaign: liveCampaign,
    liveRulesets,
    repoRules: baseRepoRules(),
  });
  assert.equal(report.readyForFinalProposal, false);
  assert.match(report.blockers.join(' | '), /still DRAFT/);
  assert.match(report.blockers.join(' | '), /timestamps/);
  assert.match(report.blockers.join(' | '), /pinned X invite post ID/);
  assert.match(report.blockers.join(' | '), /Buy-to-Earn economic treatment/);
  assert.equal(report.liveVersion, 1);
  assert.equal(report.repoVersion, 4);
});

test('weight-only Buy-to-Earn explicitly reserves no separate token pool', () => {
  const rules = baseRepoRules();
  rules.buyToEarn = {
    mode: 'WEIGHT_ONLY',
    poolBaseUnits: '0',
    tier1NetBuySol: 0.07,
    tier2NetBuySol: 0.20,
  };
  const report = buildBondRulesReconciliation({
    campaign: liveCampaign,
    liveRulesets,
    repoRules: rules,
  });
  assert.doesNotMatch(report.blockers.join(' | '), /economic treatment is not defined/);
  assert.doesNotMatch(report.blockers.join(' | '), /weight-only Buy-to-Earn cannot reserve/);
});

test('separate Buy-to-Earn pool requires exact amount and funding source', () => {
  const rules = baseRepoRules();
  rules.buyToEarn = {
    mode: 'SEPARATE_POOL',
    poolBaseUnits: '7500000000000',
    fundingSource: '',
    tier1NetBuySol: 0.07,
    tier2NetBuySol: 0.20,
  };
  const report = buildBondRulesReconciliation({
    campaign: liveCampaign,
    liveRulesets,
    repoRules: rules,
  });
  assert.match(report.blockers.join(' | '), /exact amount and funding source/);
});

test('repository rules must advance append-only beyond live rules', () => {
  const rules = baseRepoRules();
  rules.rulesetVersion = 1;
  const report = buildBondRulesReconciliation({
    campaign: liveCampaign,
    liveRulesets,
    repoRules: rules,
  });
  assert.match(report.blockers.join(' | '), /must advance beyond/);
});
