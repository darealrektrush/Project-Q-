import { validateRegistry } from './registry.js';

export const DEFAULT_CAMPAIGN_ID = 'bond-the-duck-2026';

function campaignId() {
  return process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

export async function getCampaignStatus(client) {
  const id = campaignId();
  const rows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(id)}&select=id,state,ruleset_version,funded_base_units,updated_at&limit=1`
  );
  return rows[0] ?? {
    id, state: 'DRAFT', ruleset_version: null, funded_base_units: '0', updated_at: null,
  };
}

const EXPECTED_CAMPAIGN_FUNDING_BASE_UNITS = 15_000_000_000_000n;
const EXPECTED_CYCLES = 5;
const EXPECTED_VERIFICATION_SOURCES = 13;

function enabled(value) {
  return value === 'true';
}

export async function getCampaignReadiness(client, env = process.env) {
  const id = campaignId();
  const [campaignRows, cycleRows, sourceRows, registryRows] = await Promise.all([
    client.select(
      'campaigns',
      `?id=eq.${encodeURIComponent(id)}&select=id,state,rules_hash,ruleset_version,funded_base_units&limit=1`
    ),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(id)}&select=cycle_id,opens_at,closes_at`),
    client.select(
      'verification_sources',
      `?campaign_id=eq.${encodeURIComponent(id)}&select=source_key,classification,source`
    ),
    client.select(
      'deployment_registry',
      `?campaign_id=eq.${encodeURIComponent(id)}&select=field,value,owner,evidence_url&limit=100`
    ),
  ]);

  const campaign = campaignRows[0] ?? null;
  const funded = BigInt(campaign?.funded_base_units ?? 0);
  const rulesReady = Boolean(
    campaign?.ruleset_version > 0 && /^[0-9a-f]{64}$/.test(campaign?.rules_hash ?? '')
  );
  const sourcesReady = sourceRows.length === EXPECTED_VERIFICATION_SOURCES
    && sourceRows.every((row) => !['SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY'].includes(row.classification));
  const datesReady = cycleRows.length === EXPECTED_CYCLES
    && cycleRows.every((row) => row.opens_at && row.closes_at);
  let registryReady = false;
  try {
    validateRegistry(registryRows, { requireComplete: true });
    registryReady = true;
  } catch {
    registryReady = false;
  }

  const checks = [
    { key: 'rules', label: 'Rules published and hashed', ready: rulesReady },
    { key: 'funding', label: '15,000,000 FAWKQ funding verified', ready: funded === EXPECTED_CAMPAIGN_FUNDING_BASE_UNITS },
    { key: 'registry', label: 'Deployment and vault registry complete', ready: registryReady },
    { key: 'sources', label: 'Nine voting sites and four bots certified', ready: sourcesReady },
    { key: 'dates', label: 'Five campaign cycles scheduled', ready: datesReady },
    { key: 'app', label: 'Campaign app enabled', ready: enabled(env.PROJECT_Q_CAMPAIGN_APP_ENABLED) },
    { key: 'wallet', label: 'Wallet verification enabled', ready: enabled(env.PROJECT_Q_WALLET_VERIFICATION_ENABLED) },
    { key: 'settlement', label: 'Campaign XP settlement enabled', ready: enabled(env.PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED) },
  ];

  return {
    campaignId: id,
    state: campaign?.state ?? 'DRAFT',
    ready: checks.every((check) => check.ready),
    readyCount: checks.filter((check) => check.ready).length,
    totalCount: checks.length,
    checks,
  };
}

export async function assertCampaignParticipationEnabled(client, enabledFlag) {
  if (enabledFlag !== 'true') throw new Error('campaign participation disabled');
  const status = await getCampaignStatus(client);
  if (status.state !== 'ACTIVE') throw new Error('campaign participation disabled');
  return status;
}

export async function assertWalletVerificationEnabled(
  client,
  telegramUserId,
  { verificationFlag, participationFlag } = {}
) {
  if (verificationFlag !== 'true') {
    await assertCampaignParticipationEnabled(client, participationFlag);
  }
  const participant = await getParticipantStatus(client, telegramUserId);
  if (!participant.xVerified) {
    throw new Error('verified Telegram and Oracle X identity required');
  }
  return participant;
}

export async function getParticipantStatus(client, telegramUserId) {
  const id = campaignId();
  const userId = String(telegramUserId);
  const [identityRows, xpRows] = await Promise.all([
    client.select(
      'identity_links',
      `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
        '&select=x_user_id,reward_wallet,x_verified_at,wallet_verified_at,fawkq_token_account,enrolled_at&limit=1'
    ),
    client.select(
      'campaign_xp_totals',
      `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
        '&select=cycle_id,xp&order=cycle_id.asc'
    ),
  ]);

  const identity = identityRows[0] ?? null;
  const xpByCycle = xpRows.map((row) => ({ cycleId: Number(row.cycle_id), xp: Number(row.xp) }));
  return {
    enrolled: Boolean(identity),
    xLinked: Boolean(identity?.x_user_id),
    xVerified: Boolean(identity?.x_verified_at),
    walletLinked: Boolean(identity?.reward_wallet),
    rewardWallet: identity?.reward_wallet ?? null,
    walletVerified: Boolean(identity?.wallet_verified_at),
    tokenAccountReady: Boolean(identity?.fawkq_token_account),
    xpByCycle,
    totalXp: xpByCycle.reduce((total, row) => total + row.xp, 0),
  };
}

export async function getParticipantRaidStatus(client, telegramUserId) {
  const id = campaignId();
  const rows = await client.select(
    'campaign_raid_events',
    `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      '&select=raid_id,action,tweet_id,verified_at,credited,reason&order=verified_at.desc&limit=10'
  );
  return {
    events: rows,
    verifiedActions: rows.filter((row) => row.credited).length,
    pendingActions: rows.filter((row) => !row.credited && !row.reason).length,
    rejectedActions: rows.filter((row) => Boolean(row.reason)).length,
  };
}

export function closedCampaignStatus() {
  return {
    id: campaignId(), state: 'DRAFT', ruleset_version: null,
    funded_base_units: '0', updated_at: null, unavailable: true,
  };
}

export function closedParticipantStatus() {
  return {
    enrolled: false, xLinked: false, xVerified: false, walletLinked: false,
    walletVerified: false, rewardWallet: null, tokenAccountReady: false, xpByCycle: [], totalXp: 0,
    unavailable: true,
  };
}

export function closedRaidStatus() {
  return {
    events: [], verifiedActions: 0, pendingActions: 0, rejectedActions: 0,
    unavailable: true,
  };
}
