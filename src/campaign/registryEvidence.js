import { createHash } from 'node:crypto';

import { REQUIRED_REGISTRY_FIELDS, hashRegistry } from './registry.js';
import { BOND_DRAW_POLICY } from './rules.js';

export const REGISTRY_EVIDENCE_STATUS = Object.freeze({
  PROVEN: 'PROVEN',
  BLOCKED: 'BLOCKED',
  MISSING: 'MISSING',
});

const httpsUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

function row(field, {
  status,
  value = null,
  owner = null,
  evidenceUrl = null,
  reason = null,
} = {}) {
  if (!REQUIRED_REGISTRY_FIELDS.includes(field)) throw new Error(`unknown registry field ${field}`);
  return {
    field,
    status,
    value: value == null ? null : String(value),
    owner: owner == null ? null : String(owner),
    evidence_url: httpsUrl(evidenceUrl),
    reason: reason == null ? null : String(reason),
  };
}

function proven(field, value, owner, evidenceUrl) {
  const evidence = httpsUrl(evidenceUrl);
  if (value == null || String(value).trim() === '' || !owner || !evidence) {
    return row(field, {
      status: REGISTRY_EVIDENCE_STATUS.MISSING,
      value,
      owner,
      evidenceUrl,
      reason: 'machine fact exists but immutable HTTPS evidence is not configured',
    });
  }
  return row(field, {
    status: REGISTRY_EVIDENCE_STATUS.PROVEN,
    value,
    owner,
    evidenceUrl: evidence,
  });
}

function blocked(field, reason, value = null) {
  return row(field, { status: REGISTRY_EVIDENCE_STATUS.BLOCKED, value, reason });
}

function missing(field, reason) {
  return row(field, { status: REGISTRY_EVIDENCE_STATUS.MISSING, reason });
}

function envEvidence(env, field, valueKey, evidenceKey, owner = 'operations') {
  const value = env?.[valueKey];
  const evidenceUrl = env?.[evidenceKey];
  return value
    ? proven(field, value, owner, evidenceUrl)
    : missing(field, `requires ${valueKey} and ${evidenceKey}`);
}

export function buildBondRegistryEvidence({
  campaign = null,
  rules = null,
  appConfig = null,
  sourceState = null,
  latestMigration = null,
  readiness = null,
  deployedCommitSha = null,
  repoFullName = 'darealrektrush/Project-Q-',
  projectQUrl = 'https://project-q-8k3a.onrender.com',
  env = process.env,
} = {}) {
  const commitSha = String(deployedCommitSha || '').trim();
  const commitUrl = commitSha && /^[0-9a-f]{40}$/.test(commitSha)
    ? `https://github.com/${repoFullName}/commit/${commitSha}`
    : null;
  const rulesHash = String(campaign?.rules_hash || '').trim();
  const rulesFinal = Boolean(
    rules
    && rules.status === 'FINAL'
    && Number(rules.rulesetVersion) === Number(campaign?.ruleset_version)
    && /^[0-9a-f]{64}$/.test(rulesHash)
  );
  const datesFinal = Boolean(
    rulesFinal
    && rules.schedule?.activeOpensAt
    && rules.schedule?.activeClosesAt
    && rules.schedule?.reviewClosesAt
  );
  const sourcesCertified = Boolean(sourceState?.ready);
  const readinessReady = Boolean(readiness?.ready && /^[0-9a-f]{64}$/.test(readiness?.reportHash || ''));

  const candidates = new Map();

  candidates.set('registry_version_hash', commitSha
    ? proven('registry_version_hash', commitSha, 'development', commitUrl)
    : missing('registry_version_hash', 'requires the exact deployed production commit SHA'));

  candidates.set('campaign_id_rules_hash', rulesFinal
    ? proven('campaign_id_rules_hash', `${campaign.id}:${rulesHash}`, 'campaign-governance', commitUrl)
    : blocked('campaign_id_rules_hash', 'final immutable campaign rules have not been approved'));

  candidates.set('campaign_window', datesFinal
    ? proven(
      'campaign_window',
      `${rules.schedule.activeOpensAt}..${rules.schedule.reviewClosesAt}`,
      'campaign-governance',
      commitUrl
    )
    : blocked('campaign_window', 'final campaign timestamps are intentionally selected last'));

  candidates.set('fawkq_mint_decimals', proven(
    'fawkq_mint_decimals',
    `${appConfig?.earnToBurn?.mint || ''}:6:Token-2022`,
    'development',
    commitUrl
  ));

  candidates.set('squads_multisig', envEvidence(
    env, 'squads_multisig', 'BOND_SQUADS_MULTISIG_PUBLIC', 'BOND_SQUADS_MULTISIG_EVIDENCE_URL', 'treasury'
  ));
  candidates.set('squads_community_vault', envEvidence(
    env, 'squads_community_vault', 'BOND_SQUADS_VAULT_PUBLIC', 'BOND_SQUADS_VAULT_EVIDENCE_URL', 'treasury'
  ));
  candidates.set('squads_authority_policy', envEvidence(
    env, 'squads_authority_policy', 'BOND_SQUADS_AUTHORITY_POLICY', 'BOND_SQUADS_AUTHORITY_EVIDENCE_URL', 'treasury'
  ));
  const impactFundingLocked = rules?.commitments?.topContributorLamports === '1000000000'
    && rules?.commitments?.topContributorConservationLamports === '100000000'
    && rules?.commitments?.totalSolCommitmentLamports === '1100000000'
    && rules?.commitments?.topContributorConservationDestination === 'OCEAN_CONSERVATION_VAULT'
    && rules?.commitments?.topContributorConservationAttribution === 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY';
  candidates.set('top_contributor_prize_funding', impactFundingLocked
    ? proven(
      'top_contributor_prize_funding',
      '1.0 SOL winner prize + 0.1 SOL Ocean Conservation contribution; total=1.1 SOL; separate receipts',
      'treasury',
      env?.BOND_TOP_CONTRIBUTOR_EVIDENCE_URL || commitUrl
    )
    : blocked('top_contributor_prize_funding', 'top-contributor prize and conservation impact commitment are not locked'));
  candidates.set('offline_recovery_public_key', envEvidence(
    env, 'offline_recovery_public_key', 'BOND_OFFLINE_RECOVERY_PUBLIC_KEY', 'BOND_OFFLINE_RECOVERY_EVIDENCE_URL', 'security'
  ));

  candidates.set('pump_fun_market', envEvidence(
    env, 'pump_fun_market', 'BOND_PUMP_FUN_MARKET_REF', 'BOND_PUMP_FUN_MARKET_EVIDENCE_URL', 'market-data'
  ));
  candidates.set('pump_swap_pool_migration', envEvidence(
    env, 'pump_swap_pool_migration', 'BOND_PUMP_SWAP_MIGRATION_REF', 'BOND_PUMP_SWAP_MIGRATION_EVIDENCE_URL', 'market-data'
  ));

  candidates.set('approved_secondary_markets', blocked(
    'approved_secondary_markets',
    'Buy-to-Earn approved market policy has not been finalized'
  ));

  candidates.set('pyth_sol_usd_feed', envEvidence(
    env, 'pyth_sol_usd_feed', 'BOND_PYTH_SOL_USD_FEED', 'BOND_PYTH_SOL_USD_EVIDENCE_URL', 'market-data'
  ));
  candidates.set('switchboard_sol_usd_feed', envEvidence(
    env, 'switchboard_sol_usd_feed', 'BOND_SWITCHBOARD_SOL_USD_FEED', 'BOND_SWITCHBOARD_SOL_USD_EVIDENCE_URL', 'market-data'
  ));
  candidates.set('jupiter_routing_rules', envEvidence(
    env, 'jupiter_routing_rules', 'BOND_JUPITER_ROUTING_RULES', 'BOND_JUPITER_ROUTING_EVIDENCE_URL', 'market-data'
  ));
  candidates.set('rpc_indexer_webhook', envEvidence(
    env, 'rpc_indexer_webhook', 'BOND_RPC_INDEXER_REF', 'BOND_RPC_INDEXER_EVIDENCE_URL', 'infrastructure'
  ));

  candidates.set('project_q_bot_identity', envEvidence(
    env, 'project_q_bot_identity', 'PROJECT_Q_BOT_PUBLIC_IDENTITY', 'PROJECT_Q_BOT_EVIDENCE_URL', 'operations'
  ));
  candidates.set('oracle_bot_identity', envEvidence(
    env, 'oracle_bot_identity', 'ORACLE_BOT_PUBLIC_IDENTITY', 'ORACLE_BOT_EVIDENCE_URL', 'operations'
  ));

  candidates.set('supabase_schema_version', latestMigration
    ? proven('supabase_schema_version', latestMigration, 'database', env?.SUPABASE_SCHEMA_EVIDENCE_URL || commitUrl)
    : missing('supabase_schema_version', 'latest applied Supabase migration is unavailable'));

  candidates.set('announcement_channel', envEvidence(
    env, 'announcement_channel', 'BOND_ANNOUNCEMENT_CHANNEL', 'BOND_ANNOUNCEMENT_CHANNEL_EVIDENCE_URL', 'operations'
  ));
  candidates.set('dashboard_url', proven(
    'dashboard_url',
    projectQUrl,
    'development',
    env?.PROJECT_Q_DEPLOYMENT_EVIDENCE_URL || commitUrl || projectQUrl
  ));
  candidates.set('reviewer_operator_accounts', envEvidence(
    env, 'reviewer_operator_accounts', 'BOND_REVIEWER_OPERATOR_ACCOUNTS', 'BOND_REVIEWER_OPERATOR_EVIDENCE_URL', 'operations'
  ));

  candidates.set('website_source_certifications', sourcesCertified
    ? proven(
      'website_source_certifications',
      `${sourceState.acceptingWebsiteCount || 0}/3 participant-verifiable; 9/9 operationally certified`,
      'campaign-verification',
      env?.BOND_SOURCE_CERTIFICATION_EVIDENCE_URL || commitUrl
    )
    : blocked('website_source_certifications', 'launch-window website certifications are not complete'));

  const dexUrl = env?.BOND_DEXSCREENER_URL;
  candidates.set('dexscreener_url', dexUrl
    ? proven('dexscreener_url', dexUrl, 'market-data', env?.BOND_DEXSCREENER_EVIDENCE_URL || dexUrl)
    : missing('dexscreener_url', 'canonical DexScreener FAWKQ URL is not configured'));

  const geckoUrl = rules?.verificationSources?.websiteVoting
    ?.find(({ sourceKey }) => sourceKey === 'web:geckoterminal')?.url;
  candidates.set('geckoterminal_url', geckoUrl
    ? proven('geckoterminal_url', geckoUrl, 'market-data', geckoUrl)
    : missing('geckoterminal_url', 'canonical GeckoTerminal URL is unavailable'));

  candidates.set('telegram_bot_certifications', sourcesCertified
    ? proven(
      'telegram_bot_certifications',
      `${sourceState.acceptingTelegramBotCount || 0}/5 healthy participant-verifiable bots`,
      'campaign-verification',
      env?.BOND_SOURCE_CERTIFICATION_EVIDENCE_URL || commitUrl
    )
    : blocked('telegram_bot_certifications', 'launch-window Telegram bot certifications are not complete'));

  candidates.set('winner_position_percentages', proven(
    'winner_position_percentages',
    '35/25/20/12/8',
    'campaign-governance',
    commitUrl
  ));

  const buyToEarnLocked = rules?.buyToEarn?.mode === 'WEIGHT_ONLY'
    && rules?.buyToEarn?.separateTokenPool === false
    && String(rules?.buyToEarn?.poolBaseUnits) === '0'
    && rules?.buyToEarn?.fundingSource === 'SQUADS_COMMUNITY_VAULT_CAMPAIGN_REWARDS'
    && String(rules?.buyToEarn?.includedInCampaignRewardsBaseUnits) === '15000000000000'
    && Number(rules?.buyToEarn?.tier1NetBuySol) === 0.07
    && Number(rules?.buyToEarn?.tier1Weight) === 1
    && Number(rules?.buyToEarn?.tier2NetBuySol) === 0.20
    && Number(rules?.buyToEarn?.tier2Weight) === 3
    && rules?.buyToEarn?.weightedDrawPool === 'RANKS_3_TO_15';
  candidates.set('buy_to_earn_wallet_cap', buyToEarnLocked && commitUrl
    ? proven(
      'buy_to_earn_wallet_cap',
      'WEIGHT_ONLY;separatePool=0;includedIn15M=15000000000000',
      'campaign-governance',
      commitUrl
    )
    : blocked('buy_to_earn_wallet_cap', 'Buy-to-Earn weight-only economics are not locked or deployed'));
  candidates.set('buy_to_earn_schedule', buyToEarnLocked && commitUrl
    ? proven(
      'buy_to_earn_schedule',
      'tier1=0.07SOL:weight1;tier2=0.20SOL:weight3;pool=RANKS_3_TO_15',
      'campaign-governance',
      commitUrl
    )
    : blocked('buy_to_earn_schedule', 'Buy-to-Earn tier and weight policy is not locked or deployed'));

  const drawPolicyLocked = JSON.stringify(rules?.draw || {}) === JSON.stringify(BOND_DRAW_POLICY);
  candidates.set('draw_reveal_fallback', drawPolicyLocked && commitUrl
    ? proven(
      'draw_reveal_fallback',
      [
        BOND_DRAW_POLICY.protocolVersion,
        BOND_DRAW_POLICY.cutoffRule,
        `revealWindow=${BOND_DRAW_POLICY.revealWindowMinutes}m`,
        `revealAffectsSeed=${BOND_DRAW_POLICY.revealAffectsSeed}`,
        BOND_DRAW_POLICY.fallbackPolicy,
        BOND_DRAW_POLICY.weightedDrawPool,
        `cooldown=${BOND_DRAW_POLICY.priorWinnerCooldownCycles}`,
      ].join(';'),
      'campaign-governance',
      commitUrl
    )
    : blocked(
      'draw_reveal_fallback',
      drawPolicyLocked
        ? 'draw protocol is locked but deployed immutable code evidence is unavailable'
        : 'campaign rules do not contain the locked deterministic draw protocol'
    ));
  candidates.set('payment_retry_intervals', envEvidence(
    env, 'payment_retry_intervals', 'BOND_PAYMENT_RETRY_INTERVALS', 'BOND_PAYMENT_RETRY_EVIDENCE_URL', 'treasury'
  ));
  candidates.set('priority_fee_ceiling', envEvidence(
    env, 'priority_fee_ceiling', 'BOND_PRIORITY_FEE_CEILING', 'BOND_PRIORITY_FEE_EVIDENCE_URL', 'treasury'
  ));
  candidates.set('legal_review', envEvidence(
    env, 'legal_review', 'BOND_LEGAL_REVIEW_REF', 'BOND_LEGAL_REVIEW_EVIDENCE_URL', 'governance'
  ));
  candidates.set('readiness_report', readinessReady
    ? proven(
      'readiness_report',
      `${readiness.reportVersion}:${readiness.reportHash}`,
      'campaign-governance',
      env?.BOND_READINESS_REPORT_EVIDENCE_URL || commitUrl
    )
    : blocked('readiness_report', 'all public launch gates must pass before the final readiness fingerprint is registry evidence'));

  const fields = REQUIRED_REGISTRY_FIELDS.map((field) =>
    candidates.get(field) || missing(field, 'no evidence rule configured')
  );
  const provenRows = fields.filter(({ status }) => status === REGISTRY_EVIDENCE_STATUS.PROVEN)
    .map(({ field, value, owner, evidence_url }) => ({ field, value, owner, evidence_url }));
  const complete = fields.every(({ status }) => status === REGISTRY_EVIDENCE_STATUS.PROVEN);
  const registryHash = complete ? hashRegistry(provenRows) : null;
  const reportHash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');

  return {
    campaignId: String(campaign?.id || rules?.campaignId || 'bond-the-duck-2026'),
    complete,
    provenCount: provenRows.length,
    requiredCount: REQUIRED_REGISTRY_FIELDS.length,
    registryHash,
    reportHash,
    fields,
    entries: complete ? provenRows : [],
  };
}
