import { runBondAutomatedRehearsal } from './automatedRehearsal.js';

const REQUIRED_BETA_SCENARIOS = Object.freeze([
  'happy-path', 'below-holder-floor', 'identity-replay', 'founder-exclusion',
  'website-review', 'cooldown-cap', 'referral-invite', 'recovery',
]);

function timestamp(value, label) {
  const parsed = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(parsed.getTime())) throw new Error(`${label} must be an ISO timestamp`);
  return parsed;
}

function fresh(value, now, hours) {
  const observed = timestamp(value, 'evidence timestamp').getTime();
  const current = timestamp(now, 'qualification time').getTime();
  return observed <= current + 300_000 && current - observed <= hours * 3_600_000;
}

export function evaluateTeamBetaEvidence(evidence, now = new Date().toISOString()) {
  const reasons = [];
  if (!evidence || evidence.schema !== 'bond-team-beta-v1') reasons.push('team beta evidence is missing');
  if (evidence?.environment !== 'ISOLATED_STAGING') reasons.push('team beta must run in isolated staging');
  if (evidence?.productionDataTouched !== false) reasons.push('team beta must not touch production data');
  if (!Number.isSafeInteger(evidence?.testerCount) || evidence.testerCount < 6) reasons.push('at least six team testers are required');
  if (Number(evidence?.criticalIssues || 0) !== 0 || Number(evidence?.highIssues || 0) !== 0) {
    reasons.push('critical and high issues must be zero');
  }
  let evidenceFresh = false;
  try { evidenceFresh = fresh(evidence?.completedAt, now, 48); } catch { evidenceFresh = false; }
  if (!evidenceFresh) reasons.push('team beta evidence must be completed within 48 hours');
  const scenarios = new Map((evidence?.scenarios || []).map((row) => [row.id, row.status]));
  for (const id of REQUIRED_BETA_SCENARIOS) {
    if (scenarios.get(id) !== 'PASSED') reasons.push(`team beta scenario is not passed: ${id}`);
  }
  return { ready: reasons.length === 0, reasons, requiredScenarioCount: REQUIRED_BETA_SCENARIOS.length };
}

export function evaluateOnchainEvidence(evidence, now = new Date().toISOString()) {
  const reasons = [];
  if (!evidence || evidence.schema !== 'bond-devnet-rehearsal-v1') reasons.push('on-chain rehearsal evidence is missing');
  if (evidence?.mode !== 'FULL_175_RELEASE_LEDGER') reasons.push('full 175-release ledger must execute');
  if (evidence?.passed !== true) reasons.push('on-chain rehearsal did not pass');
  if (evidence?.productionAssetsTouched !== false) reasons.push('on-chain rehearsal must not touch production assets');
  let evidenceFresh = false;
  try { evidenceFresh = fresh(evidence?.completedAt, now, 48); } catch { evidenceFresh = false; }
  if (!evidenceFresh) reasons.push('on-chain rehearsal evidence must be completed within 48 hours');
  const requiredGates = [
    'isolatedDevnet', 'token2022Mint', 'squadsThreshold2Of3', 'planned175Transfers',
    'planned15mRewards', 'executedFullRewardLedger', 'vaultBalanceReconciled',
    'burn15mExecuted', 'supplyBurnReconciled', 'impactPaymentsSeparated',
  ];
  for (const gate of requiredGates) if (evidence?.gates?.[gate] !== true) reasons.push(`on-chain gate is not passed: ${gate}`);
  return { ready: reasons.length === 0, reasons, requiredGateCount: requiredGates.length };
}

export function buildBondLaunchQualification({
  betaEvidence = null,
  onchainEvidence = null,
  productionReadiness = null,
  now = new Date().toISOString(),
} = {}) {
  const automated = runBondAutomatedRehearsal();
  const beta = evaluateTeamBetaEvidence(betaEvidence, now);
  const onchain = evaluateOnchainEvidence(onchainEvidence, now);
  const production = {
    ready: productionReadiness?.ready === true,
    reasons: productionReadiness?.ready === true ? [] : ['production readiness report is not green'],
  };
  const gates = {
    automated: automated.automatedReady,
    teamBeta: beta.ready,
    onchain: onchain.ready,
    production: production.ready,
  };
  return {
    schema: 'bond-launch-qualification-v1',
    campaignId: 'bond-the-duck-2026',
    evaluatedAt: timestamp(now, 'qualification time').toISOString(),
    ready: Object.values(gates).every(Boolean),
    gates,
    blockers: [...beta.reasons, ...onchain.reasons, ...production.reasons],
    automatedFingerprint: automated.reportFingerprint,
    mutationsPerformed: false,
  };
}
