const MUTATION_FLAGS = Object.freeze([
  'PROJECT_Q_CAMPAIGN_APP_ENABLED',
  'PROJECT_Q_ORACLE_WALLET_EVENTS_ENABLED',
  'PROJECT_Q_ORACLE_TRADE_EVENTS_ENABLED',
  'PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED',
  'PROJECT_Q_EARN_TO_BURN_ENABLED',
  'PROJECT_Q_BURN_VERIFICATION_ENABLED',
  'PROJECT_Q_DISTRIBUTIONS_ENABLED',
  'PROJECT_Q_BURN_PROVISIONING_ENABLED',
  'PROJECT_Q_IMPACT_RECEIPTS_ENABLED',
]);

function enabled(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

export function buildBondLaunchRehearsal({
  campaign = null,
  readiness = null,
  funding = null,
  burnAudit = null,
  rulesAudit = null,
  counts = {},
  env = process.env,
} = {}) {
  const integrityBlockers = [];
  const launchBlockers = [];
  const pending = [];

  if (!campaign || campaign.state !== 'DRAFT') {
    integrityBlockers.push('campaign must remain DRAFT during rehearsal');
  }

  const forbiddenPrelaunchCounts = [
    ['cycles', Number(counts.cycles || 0)],
    ['drawCutoffs', Number(counts.drawCutoffs || 0)],
    ['drawFinalizations', Number(counts.drawFinalizations || 0)],
    ['winners', Number(counts.winners || 0)],
    ['allocations', Number(counts.allocations || 0)],
    ['impactReceipts', Number(counts.impactReceipts || 0)],
    ['topContributorFinalizations', Number(counts.topContributorFinalizations || 0)],
  ];
  for (const [name, value] of forbiddenPrelaunchCounts) {
    if (value !== 0) integrityBlockers.push(`unexpected pre-launch ${name}: ${value}`);
  }

  const activeMutationFlags = MUTATION_FLAGS.filter((name) => enabled(env[name]));
  if (activeMutationFlags.length) {
    integrityBlockers.push(`pre-launch mutation flags enabled: ${activeMutationFlags.join(', ')}`);
  }

  if (!readiness?.reportHash || !/^[0-9a-f]{64}$/.test(readiness.reportHash)) {
    integrityBlockers.push('readiness fingerprint is unavailable');
  }

  if (!rulesAudit?.readyForFinalProposal) {
    pending.push(...(rulesAudit?.blockers || ['final rules packet is not ready']));
  }
  if (!funding?.finalized || String(funding?.fundedBaseUnits || '0') !== '17500000000000') {
    pending.push('funding evidence is not finalized');
  }
  if (!burnAudit?.ready) {
    pending.push(...(burnAudit?.blockers || ['Earn-to-Burn provisioning is not ready']));
  }
  if (!readiness?.ready) {
    for (const check of readiness?.checks || []) {
      if (!check.ready) launchBlockers.push(check.label || check.key);
    }
  }

  const uniquePending = [...new Set(pending)];
  const uniqueLaunchBlockers = [...new Set(launchBlockers)];

  return {
    campaignId: String(campaign?.id || 'bond-the-duck-2026'),
    integritySafe: integrityBlockers.length === 0,
    launchReady: integrityBlockers.length === 0
      && uniquePending.length === 0
      && uniqueLaunchBlockers.length === 0,
    integrityBlockers,
    pendingFinalization: uniquePending,
    launchBlockers: uniqueLaunchBlockers,
    readinessReportVersion: readiness?.reportVersion || null,
    readinessReportHash: readiness?.reportHash || null,
    mutationsPerformed: false,
  };
}
