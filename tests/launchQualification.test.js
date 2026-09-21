import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBondLaunchQualification } from '../src/campaign/launchQualification.js';

const now = '2030-01-20T20:00:00.000Z';
const beta = {
  schema: 'bond-team-smoke-v2', environment: 'ISOLATED_STAGING', testerCount: 3,
  completedAt: '2030-01-20T19:00:00.000Z', criticalIssues: 0, highIssues: 0,
  productionDataTouched: false,
  scenarios: ['telegram-navigation', 'x-oauth-link', 'wallet-session', 'comprehension-recovery']
    .map((id) => ({ id, status: 'PASSED' })),
};
const gates = {
  isolatedDevnet: true, token2022Mint: true, squadsThreshold2Of3: true,
  planned175Transfers: true, planned15mRewards: true, executedFullRewardLedger: true,
  vaultBalanceReconciled: true, burn15mExecuted: true, supplyBurnReconciled: true,
  impactPaymentsSeparated: true,
};
const onchain = {
  schema: 'bond-devnet-rehearsal-v1', mode: 'FULL_175_RELEASE_LEDGER', passed: true,
  completedAt: '2030-01-20T19:30:00.000Z', productionAssetsTouched: false, gates,
};

test('launch qualification passes only all four evidence layers together', () => {
  const report = buildBondLaunchQualification({ betaEvidence: beta, onchainEvidence: onchain, productionReadiness: { ready: true }, now });
  assert.equal(report.ready, true);
  assert.deepEqual(report.gates, { automated: true, teamBeta: true, onchain: true, production: true });
  assert.equal(report.blockers.length, 0);
  assert.equal(report.mutationsPerformed, false);
});

test('team usability evidence requires three testers and every external-client scenario', () => {
  const tooFew = buildBondLaunchQualification({
    betaEvidence: { ...beta, testerCount: 2 }, onchainEvidence: onchain,
    productionReadiness: { ready: true }, now,
  });
  assert.equal(tooFew.ready, false);
  assert.match(tooFew.blockers.join('; '), /at least three/);

  const missingWallet = buildBondLaunchQualification({
    betaEvidence: { ...beta, scenarios: beta.scenarios.filter(({ id }) => id !== 'wallet-session') },
    onchainEvidence: onchain, productionReadiness: { ready: true }, now,
  });
  assert.equal(missingWallet.ready, false);
  assert.match(missingWallet.blockers.join('; '), /wallet-session/);
});

test('launch qualification fails closed on missing evidence', () => {
  const report = buildBondLaunchQualification({ now });
  assert.equal(report.ready, false);
  assert.equal(report.gates.automated, true);
  assert.equal(report.gates.teamBeta, false);
  assert.equal(report.gates.onchain, false);
  assert.equal(report.gates.production, false);
  assert.ok(report.blockers.length > 3);
});

test('stale beta or partial Devnet execution cannot qualify launch', () => {
  const report = buildBondLaunchQualification({
    betaEvidence: { ...beta, completedAt: '2030-01-17T19:00:00.000Z' },
    onchainEvidence: { ...onchain, mode: 'REPRESENTATIVE_SQUADS_BATCH', gates: { ...gates, executedFullRewardLedger: false } },
    productionReadiness: { ready: true }, now,
  });
  assert.equal(report.ready, false);
  assert.match(report.blockers.join('; '), /48 hours/);
  assert.match(report.blockers.join('; '), /175-release/);
});
