import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBondRegistryEvidence,
  REGISTRY_EVIDENCE_STATUS,
} from '../src/campaign/registryEvidence.js';
import { REQUIRED_REGISTRY_FIELDS, validateRegistry } from '../src/campaign/registry.js';
import { BOND_DRAW_POLICY } from '../src/campaign/rules.js';

const rules = {
  campaignId: 'bond-the-duck-2026',
  rulesetVersion: 4,
  status: 'DRAFT',
  schedule: {
    activeOpensAt: null,
    activeClosesAt: null,
    reviewClosesAt: null,
  },
  verificationSources: {
    websiteVoting: [{
      sourceKey: 'web:geckoterminal',
      url: 'https://www.geckoterminal.com/solana/pools/example',
    }],
  },
  draw: structuredClone(BOND_DRAW_POLICY),
  commitments: {
    topContributorLamports: '1000000000',
    topContributorConservationLamports: '100000000',
    topContributorConservationFundingSource: 'PROJECT_FUNDED_SEPARATE_SOL',
    topContributorConservationDestination: 'OCEAN_CONSERVATION_VAULT',
    topContributorConservationAttribution: 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY',
    totalSolCommitmentLamports: '1100000000',
  },
  buyToEarn: {
    mode: 'WEIGHT_ONLY',
    separateTokenPool: false,
    poolBaseUnits: '0',
    fundingSource: 'SQUADS_COMMUNITY_VAULT_CAMPAIGN_REWARDS',
    includedInCampaignRewardsBaseUnits: '15000000000000',
    tier1NetBuySol: 0.07,
    tier1Weight: 1,
    tier2NetBuySol: 0.20,
    tier2Weight: 3,
    weightedDrawPool: 'RANKS_3_TO_15',
  },
};

const appConfig = {
  earnToBurn: {
    mint: 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
  },
};

test('registry evidence audit always covers the exact 34 required fields', () => {
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'a'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920080000_bond_holder_eligibility',
  });
  assert.equal(report.requiredCount, REQUIRED_REGISTRY_FIELDS.length);
  assert.equal(report.fields.length, REQUIRED_REGISTRY_FIELDS.length);
  assert.deepEqual(
    report.fields.map(({ field }) => field),
    REQUIRED_REGISTRY_FIELDS
  );
  assert.equal(report.complete, false);
  assert.equal(report.entries.length, 0);
});

test('registry audit keeps final-rule and launch-window evidence explicitly blocked', () => {
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'a'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920080000_bond_holder_eligibility',
  });
  const byField = new Map(report.fields.map((row) => [row.field, row]));
  assert.equal(byField.get('campaign_id_rules_hash').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
  assert.equal(byField.get('campaign_window').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
  assert.equal(byField.get('website_source_certifications').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
  assert.equal(byField.get('telegram_bot_certifications').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
  assert.equal(byField.get('readiness_report').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
});

test('registry audit treats Buy-to-Earn as weight-only inside 15M once deployed evidence exists', () => {
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'a'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920180000_lock_bond_buytoearn_conservation_economics',
    deployedCommitSha: 'a'.repeat(40),
  });
  const byField = new Map(report.fields.map((row) => [row.field, row]));
  assert.equal(byField.get('approved_secondary_markets').status, REGISTRY_EVIDENCE_STATUS.BLOCKED);
  assert.equal(byField.get('buy_to_earn_wallet_cap').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('buy_to_earn_schedule').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.match(byField.get('buy_to_earn_wallet_cap').value, /separatePool=0/);
  assert.match(byField.get('buy_to_earn_schedule').value, /weight3/);
  assert.equal(byField.get('top_contributor_prize_funding').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.match(byField.get('top_contributor_prize_funding').value, /0\.1 SOL Ocean Conservation/);
});

test('registry audit proves only enabled markets with immutable evidence', () => {
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'a'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920180000_lock_bond_buytoearn_conservation_economics',
    deployedCommitSha: 'a'.repeat(40),
    approvedMarkets: [{
      venue_key: 'pump_swap',
      enabled: true,
      evidence_url: 'https://example.com/pump-swap-policy',
      verified_at: '2026-09-21T12:00:00.000Z',
    }],
  });
  const byField = new Map(report.fields.map((row) => [row.field, row]));
  assert.equal(byField.get('approved_secondary_markets').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('approved_secondary_markets').value, 'pump_swap');
});

test('readiness registry evidence proves the contract without requiring its circular final result', () => {
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'a'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920180000_lock_bond_buytoearn_conservation_economics',
    deployedCommitSha: 'a'.repeat(40),
    readiness: {
      ready: false,
      reportVersion: 'bond-readiness-v2',
      reportHash: 'e'.repeat(64),
    },
  });
  const row = report.fields.find(({ field }) => field === 'readiness_report');
  assert.equal(row.status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(row.value, `bond-readiness-v2:contract:${'a'.repeat(40)}`);
});

test('registry audit proves immutable public machine facts only when stable HTTPS evidence exists', () => {
  const commit = 'a'.repeat(40);
  const report = buildBondRegistryEvidence({
    campaign: { id: 'bond-the-duck-2026', rules_hash: 'b'.repeat(64), ruleset_version: 4 },
    rules,
    appConfig,
    latestMigration: '20260920080000_bond_holder_eligibility',
    deployedCommitSha: commit,
  });
  const byField = new Map(report.fields.map((row) => [row.field, row]));
  assert.equal(byField.get('registry_version_hash').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('fawkq_mint_decimals').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('supabase_schema_version').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('winner_position_percentages').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.equal(byField.get('draw_reveal_fallback').status, REGISTRY_EVIDENCE_STATUS.PROVEN);
  assert.match(byField.get('draw_reveal_fallback').value, /bond-draw-v1/);
  assert.match(byField.get('draw_reveal_fallback').value, /RANKS_3_TO_15/);
  assert.match(byField.get('fawkq_mint_decimals').value, /Token-2022/);
});

test('a complete evidence report produces rows accepted by registry validation and a deterministic hash', () => {
  const commit = 'c'.repeat(40);
  const finalRules = structuredClone(rules);
  finalRules.status = 'FINAL';
  finalRules.schedule = {
    activeOpensAt: '2026-10-01T15:00:00.000Z',
    activeClosesAt: '2026-10-11T15:00:00.000Z',
    reviewClosesAt: '2026-10-15T15:00:00.000Z',
  };
  const env = {
    BOND_SQUADS_MULTISIG_PUBLIC: 'multisig-ref',
    BOND_SQUADS_MULTISIG_EVIDENCE_URL: 'https://example.com/multisig',
    BOND_SQUADS_VAULT_PUBLIC: 'vault-ref',
    BOND_SQUADS_VAULT_EVIDENCE_URL: 'https://example.com/vault',
    BOND_SQUADS_AUTHORITY_POLICY: '2-of-3',
    BOND_SQUADS_AUTHORITY_EVIDENCE_URL: 'https://example.com/policy',
    BOND_TOP_CONTRIBUTOR_FUNDING_REF: '1.1-SOL-impact-funded',
    BOND_TOP_CONTRIBUTOR_EVIDENCE_URL: 'https://example.com/top',
    BOND_OFFLINE_RECOVERY_PUBLIC_KEY: 'recovery-public',
    BOND_OFFLINE_RECOVERY_EVIDENCE_URL: 'https://example.com/recovery',
    BOND_PUMP_FUN_MARKET_REF: 'pump-fun',
    BOND_PUMP_FUN_MARKET_EVIDENCE_URL: 'https://example.com/pump',
    BOND_PUMP_SWAP_MIGRATION_REF: 'pump-swap',
    BOND_PUMP_SWAP_MIGRATION_EVIDENCE_URL: 'https://example.com/pumpswap',
    BOND_PYTH_SOL_USD_FEED: 'pyth-feed',
    BOND_PYTH_SOL_USD_EVIDENCE_URL: 'https://example.com/pyth',
    BOND_SWITCHBOARD_SOL_USD_FEED: 'switchboard-feed',
    BOND_SWITCHBOARD_SOL_USD_EVIDENCE_URL: 'https://example.com/switchboard',
    BOND_JUPITER_ROUTING_RULES: 'locked',
    BOND_JUPITER_ROUTING_EVIDENCE_URL: 'https://example.com/jupiter',
    BOND_RPC_INDEXER_REF: 'helius',
    BOND_RPC_INDEXER_EVIDENCE_URL: 'https://example.com/helius',
    PROJECT_Q_BOT_PUBLIC_IDENTITY: '@ProjectQ',
    PROJECT_Q_BOT_EVIDENCE_URL: 'https://example.com/q',
    ORACLE_BOT_PUBLIC_IDENTITY: '@Oracle',
    ORACLE_BOT_EVIDENCE_URL: 'https://example.com/oracle',
    BOND_ANNOUNCEMENT_CHANNEL: '@CrabStarOfficial',
    BOND_ANNOUNCEMENT_CHANNEL_EVIDENCE_URL: 'https://example.com/announcement',
    BOND_REVIEWER_OPERATOR_ACCOUNTS: '2 founders',
    BOND_REVIEWER_OPERATOR_EVIDENCE_URL: 'https://example.com/reviewers',
    BOND_SOURCE_CERTIFICATION_EVIDENCE_URL: 'https://example.com/certs',
    BOND_DEXSCREENER_URL: 'https://dexscreener.com/solana/example',
    BOND_PAYMENT_RETRY_INTERVALS: '10m,30m,2h',
    BOND_PAYMENT_RETRY_EVIDENCE_URL: 'https://example.com/retry',
    BOND_PRIORITY_FEE_CEILING: '100000 lamports',
    BOND_PRIORITY_FEE_EVIDENCE_URL: 'https://example.com/fee',
    BOND_LEGAL_REVIEW_REF: 'approved',
    BOND_LEGAL_REVIEW_EVIDENCE_URL: 'https://example.com/legal',
    BOND_READINESS_REPORT_EVIDENCE_URL: 'https://example.com/readiness',
  };

  // Launch-window and approved-market evidence still keep this report incomplete.
  const report = buildBondRegistryEvidence({
    campaign: {
      id: 'bond-the-duck-2026',
      rules_hash: 'd'.repeat(64),
      ruleset_version: 4,
    },
    rules: finalRules,
    appConfig,
    sourceState: {
      ready: true,
      acceptingWebsiteCount: 3,
      acceptingTelegramBotCount: 5,
    },
    approvedMarkets: [{
      venue_key: 'pump_swap',
      enabled: true,
      evidence_url: 'https://example.com/pumpswap',
      verified_at: '2026-09-21T12:00:00.000Z',
    }],
    latestMigration: '20260920080000_bond_holder_eligibility',
    readiness: {
      ready: true,
      reportVersion: 'bond-readiness-v2',
      reportHash: 'e'.repeat(64),
    },
    deployedCommitSha: commit,
    env,
  });

  assert.equal(report.complete, true);
  assert.match(report.registryHash, /^[0-9a-f]{64}$/);
  assert.equal(report.entries.length, REQUIRED_REGISTRY_FIELDS.length);

  // The subset already proven is individually registry-safe.
  const proven = report.fields
    .filter(({ status }) => status === REGISTRY_EVIDENCE_STATUS.PROVEN)
    .map(({ field, value, owner, evidence_url }) => ({ field, value, owner, evidence_url }));
  assert.doesNotThrow(() => validateRegistry(proven));
});
