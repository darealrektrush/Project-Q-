import test from 'node:test';
import assert from 'node:assert/strict';

import {
  burnVerificationEnabled,
  campaignReadinessApprovalsEnabled,
  campaignRulesGovernanceEnabled,
  distributionEnabled,
  earnToBurnEnabled,
  isEnabled,
  requireEnv,
  signalsEnabled,
  sourceCertificationEnabled,
  telegramTrendingReceiptsEnabled,
  websiteVoteReviewEnabled,
} from '../src/lib/featureFlags.js';

test('feature flags default to disabled', () => {
  assert.equal(distributionEnabled({}), false);
  assert.equal(signalsEnabled({}), false);
  assert.equal(earnToBurnEnabled({}), false);
  assert.equal(burnVerificationEnabled({}), false);
  assert.equal(campaignReadinessApprovalsEnabled({}), false);
  assert.equal(campaignRulesGovernanceEnabled({}), false);
  assert.equal(sourceCertificationEnabled({}), false);
  assert.equal(websiteVoteReviewEnabled({}), false);
  assert.equal(telegramTrendingReceiptsEnabled({}), false);
});

test('campaign readiness approvals require their dedicated flag', () => {
  assert.equal(campaignReadinessApprovalsEnabled({
    PROJECT_Q_CAMPAIGN_READINESS_APPROVALS_ENABLED: 'true',
  }), true);
  assert.equal(campaignReadinessApprovalsEnabled({
    PROJECT_Q_EARN_TO_BURN_ENABLED: 'true',
  }), false);
});

test('campaign rules governance requires its dedicated flag', () => {
  assert.equal(campaignRulesGovernanceEnabled({
    PROJECT_Q_CAMPAIGN_RULES_GOVERNANCE_ENABLED: 'true',
  }), true);
  assert.equal(campaignRulesGovernanceEnabled({
    PROJECT_Q_CAMPAIGN_READINESS_APPROVALS_ENABLED: 'true',
  }), false);
});

test('verification source certification requires its dedicated flag', () => {
  assert.equal(sourceCertificationEnabled({
    PROJECT_Q_SOURCE_CERTIFICATION_ENABLED: 'true',
  }), true);
  assert.equal(sourceCertificationEnabled({
    PROJECT_Q_CAMPAIGN_RULES_GOVERNANCE_ENABLED: 'true',
  }), false);
});

test('website vote review requires its dedicated flag', () => {
  assert.equal(websiteVoteReviewEnabled({
    PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED: 'true',
  }), true);
  assert.equal(websiteVoteReviewEnabled({
    PROJECT_Q_SOURCE_CERTIFICATION_ENABLED: 'true',
  }), false);
});

test('Telegram trending receipts require their dedicated flag', () => {
  assert.equal(telegramTrendingReceiptsEnabled({
    PROJECT_Q_TRENDING_RECEIPTS_ENABLED: 'true',
  }), true);
  assert.equal(telegramTrendingReceiptsEnabled({
    PROJECT_Q_SOURCE_CERTIFICATION_ENABLED: 'true',
  }), false);
});

test('feature flags require an explicit true value', () => {
  for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
    assert.equal(isEnabled(value), true);
  }
  for (const value of [undefined, '', 'false', '0', 'enabled', 'no']) {
    assert.equal(isEnabled(value), false);
  }
});

test('requireEnv reports names without exposing values', () => {
  assert.doesNotThrow(() => requireEnv(['A', 'B'], { A: 'set', B: 'set' }));
  assert.throws(
    () => requireEnv(['A', 'B'], { A: 'secret-value', B: '' }),
    (error) => {
      assert.match(error.message, /B/);
      assert.doesNotMatch(error.message, /secret-value/);
      return true;
    }
  );
});
