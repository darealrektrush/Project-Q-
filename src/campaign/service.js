import { validateRegistry } from './registry.js';
import { loadDailyXpUsage, utcDayKey } from './xpCaps.js';
import { EXPECTED_CYCLES, getCampaignRuntimeState, lockedCampaignCyclesMatch } from './schedule.js';

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

export async function getCampaignRuntime(client, {
  now = new Date(),
  participationEnabled = process.env.PROJECT_Q_CAMPAIGN_APP_ENABLED === 'true',
} = {}) {
  const [campaign, cycleRows] = await Promise.all([
    getCampaignStatus(client),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(campaignId())}&select=cycle_id,opens_at,closes_at`),
  ]);
  const scheduleReady = lockedCampaignCyclesMatch(cycleRows);
  return {
    campaignId: campaign.id,
    serverNow: new Date(now).toISOString(),
    ...getCampaignRuntimeState(campaign.state, now, { participationEnabled, scheduleReady }),
  };
}

const EXPECTED_CAMPAIGN_FUNDING_BASE_UNITS = 15_000_000_000_000n;
const EXPECTED_VERIFICATION_SOURCES = 13;
const PUBLIC_READINESS_KEYS = new Set([
  'rules', 'funding', 'registry', 'sources', 'dates', 'app', 'wallet', 'settlement',
  'burn-rules', 'burn-progress', 'burn-verification',
]);

function enabled(value) {
  return value === 'true';
}

export async function getCampaignReadiness(client, env = process.env) {
  const id = campaignId();
  const [campaignRows, cycleRows, sourceRows, registryRows, burnProgramRows] = await Promise.all([
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
    client.select(
      'earn_to_burn_programs',
      `?campaign_id=eq.${encodeURIComponent(id)}&select=id,state,mint,token_program_id,decimals,rules_hash,hard_cap_base_units,max_single_burn_base_units&limit=1`
    ),
  ]);

  const campaign = campaignRows[0] ?? null;
  const funded = BigInt(campaign?.funded_base_units ?? 0);
  const rulesReady = Boolean(
    campaign?.ruleset_version > 0 && /^[0-9a-f]{64}$/.test(campaign?.rules_hash ?? '')
  );
  const sourcesReady = sourceRows.length === EXPECTED_VERIFICATION_SOURCES
    && sourceRows.every((row) => !['SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY'].includes(row.classification));
  const datesReady = lockedCampaignCyclesMatch(cycleRows);
  let registryReady = false;
  try {
    validateRegistry(registryRows, { requireComplete: true });
    registryReady = true;
  } catch {
    registryReady = false;
  }
  const burnProgram = burnProgramRows[0] ?? null;
  let burnRulesReady = false;
  if (burnProgram) {
    const [burnSources, burnFounders, burnMilestones] = await Promise.all([
      client.select('burn_source_accounts', `?program_id=eq.${encodeURIComponent(burnProgram.id)}&select=source_type,approved,evidence_url,verified_at`),
      client.select('burn_program_founders', `?program_id=eq.${encodeURIComponent(burnProgram.id)}&select=founder_user_id`),
      client.select('burn_milestones', `?program_id=eq.${encodeURIComponent(burnProgram.id)}&select=id,rules_hash,progress_target_units,burn_amount_base_units,state`),
    ]);
    const approvedCreatorSource = burnSources.some(({ source_type, approved, evidence_url, verified_at }) =>
      source_type === 'CREATOR_WALLET_RESERVE' && approved && evidence_url && verified_at
    );
    burnRulesReady = burnProgram.state === 'ENABLED'
      && burnProgram.mint === 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'
      && burnProgram.token_program_id === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
      && Number(burnProgram.decimals) === 6
      && /^[0-9a-f]{64}$/.test(burnProgram.rules_hash ?? '')
      && burnFounders.length === 2
      && approvedCreatorSource
      && burnMilestones.length > 0
      && burnMilestones.every(({ rules_hash }) => rules_hash === burnProgram.rules_hash);
  }

  const checks = [
    { key: 'rules', label: 'Rules published and hashed', ready: rulesReady },
    { key: 'funding', label: '15,000,000 FAWKQ funding verified', ready: funded === EXPECTED_CAMPAIGN_FUNDING_BASE_UNITS },
    { key: 'registry', label: 'Deployment and vault registry complete', ready: registryReady },
    { key: 'sources', label: 'Nine voting sites and four bots certified', ready: sourcesReady },
    { key: 'dates', label: `${EXPECTED_CYCLES} locked 48-hour cycles scheduled`, ready: datesReady },
    { key: 'app', label: 'Campaign app enabled', ready: enabled(env.PROJECT_Q_CAMPAIGN_APP_ENABLED) },
    { key: 'wallet', label: 'Wallet verification enabled', ready: enabled(env.PROJECT_Q_WALLET_VERIFICATION_ENABLED) },
    { key: 'settlement', label: 'Campaign XP settlement enabled', ready: enabled(env.PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED) },
    { key: 'burn-rules', label: 'Earn to Burn rules, founders, source and milestones verified', ready: burnRulesReady },
    { key: 'burn-progress', label: 'Earn to Burn progress enabled', ready: enabled(env.PROJECT_Q_EARN_TO_BURN_ENABLED) },
    { key: 'burn-verification', label: 'On-chain burn verification enabled', ready: enabled(env.PROJECT_Q_BURN_VERIFICATION_ENABLED) },
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

export function toPublicCampaignReadiness(readiness) {
  const checks = Array.isArray(readiness?.checks)
    ? readiness.checks
      .filter(({ key }) => PUBLIC_READINESS_KEYS.has(key))
      .map(({ key, label, ready }) => ({ key: String(key), label: String(label), ready: Boolean(ready) }))
    : [];
  const readyCount = checks.filter(({ ready }) => ready).length;
  const totalCount = checks.length;
  return {
    available: true,
    campaignId: String(readiness?.campaignId || DEFAULT_CAMPAIGN_ID),
    state: String(readiness?.state || 'DRAFT'),
    ready: totalCount > 0 && readyCount === totalCount,
    readyCount,
    totalCount,
    percent: totalCount ? Math.round((readyCount / totalCount) * 100) : 0,
    checks,
  };
}

export async function getPublicCampaignReadiness(client, env = process.env) {
  return toPublicCampaignReadiness(await getCampaignReadiness(client, env));
}

export function closedPublicCampaignReadiness() {
  return {
    available: false,
    campaignId: DEFAULT_CAMPAIGN_ID,
    state: 'DRAFT',
    ready: false,
    readyCount: 0,
    totalCount: 0,
    percent: null,
    checks: [],
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

function latestAllocationRows(rows) {
  const latest = new Map();
  for (const row of rows) {
    const key = [row.category, row.cycle_id ?? 'campaign', row.reward_wallet ?? 'participant'].join(':');
    const current = latest.get(key);
    if (!current || Number(row.calc_version || 0) > Number(current.calc_version || 0)) latest.set(key, row);
  }
  return [...latest.values()];
}

function sumBaseUnits(rows, field = 'amount_base_units') {
  return rows.reduce((total, row) => total + BigInt(row[field] ?? 0), 0n).toString();
}

export async function getParticipantStatus(client, telegramUserId, { now = new Date().toISOString() } = {}) {
  const id = campaignId();
  const userId = String(telegramUserId);
  const identityRows = await client.select(
    'identity_links',
    `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
      '&select=x_user_id,reward_wallet,x_verified_at,wallet_verified_at,fawkq_token_account,enrolled_at&limit=1'
  );
  const identity = identityRows[0] ?? null;
  const walletFilter = identity?.reward_wallet
    ? `&reward_wallet=eq.${encodeURIComponent(identity.reward_wallet)}`
    : '&reward_wallet=eq.__no_verified_wallet__';
  const allocationOwnerFilter = identity?.reward_wallet
    ? `&or=(telegram_user_id.eq.${encodeURIComponent(userId)},reward_wallet.eq.${encodeURIComponent(identity.reward_wallet)})`
    : `&telegram_user_id=eq.${encodeURIComponent(userId)}`;
  const [xpRows, ledgerRows, xpDetailRows, rawAllocationRows, positionRows, dailyXp, campaignRows] = await Promise.all([
    client.select(
      'campaign_xp_totals',
      `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
        '&select=cycle_id,xp&order=cycle_id.asc'
    ),
    client.select(
      'xp_ledger',
      `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
        '&select=id,cycle_id,source,cap_bucket,amount,mission_code,awarded_at&order=awarded_at.desc&limit=25'
    ),
    client.select(
      'xp_ledger',
      `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(userId)}` +
        '&select=cap_bucket,amount,mission_code&limit=1000'
    ),
    client.select(
      'allocations',
      `?campaign_id=eq.${encodeURIComponent(id)}${allocationOwnerFilter}` +
        '&select=id,category,cycle_id,reward_wallet,gross_base_units,calc_version,manifest_version,eligibility_status,created_at' +
        '&order=calc_version.desc,created_at.desc&limit=250'
    ),
    client.select(
      'positions',
      `?campaign_id=eq.${encodeURIComponent(id)}${walletFilter}` +
        '&select=eligible_bought_base_units,eligible_sold_base_units,net_buy_lamports,tier,weight,snapshot_usd,eligible&limit=1'
    ),
    loadDailyXpUsage(client, id, userId, utcDayKey(now)),
    client.select('campaigns', `?id=eq.${encodeURIComponent(id)}&select=state&limit=1`),
  ]);

  const allocationRows = latestAllocationRows(rawAllocationRows);
  const allocationIds = allocationRows.map(({ id: allocationId }) => Number(allocationId)).filter(Number.isSafeInteger);
  const releaseRows = allocationIds.length ? await client.select(
    'releases',
    `?allocation_id=in.(${allocationIds.join(',')})` +
      '&select=allocation_id,pct,scheduled_at,amount_base_units,status&order=scheduled_at.asc&limit=500'
  ) : [];

  const xpByCycle = xpRows.map((row) => ({ cycleId: Number(row.cycle_id), xp: Number(row.xp) }));
  const xpByBucket = xpDetailRows.reduce((totals, row) => {
    const bucket = ['participation', 'mission', 'other'].includes(row.cap_bucket) ? row.cap_bucket : 'other';
    totals[bucket] += Number(row.amount || 0);
    return totals;
  }, { participation: 0, mission: 0, other: 0 });
  const allocationByCategory = allocationRows.reduce((totals, row) => {
    const category = row.category || 'other';
    totals[category] = (BigInt(totals[category] ?? 0) + BigInt(row.gross_base_units ?? 0)).toString();
    return totals;
  }, {});
  const allocationBaseUnits = allocationRows.length
    ? sumBaseUnits(allocationRows, 'gross_base_units')
    : null;
  const allocationById = new Map(allocationRows.map((row) => [String(row.id), row]));
  const scheduledReleases = releaseRows.filter(({ status }) => ['scheduled', 'proposed', 'reserve'].includes(status));
  const distributedReleases = releaseRows.filter(({ status }) => ['paid', 'recovered'].includes(status));
  const failedReleases = releaseRows.filter(({ status }) => status === 'failed');
  const completedMissionCodes = [...new Set(xpDetailRows.map((row) => row.mission_code).filter(Boolean))];
  return {
    enrolled: Boolean(identity),
    enrolledAt: identity?.enrolled_at ?? null,
    xLinked: Boolean(identity?.x_user_id),
    xVerified: Boolean(identity?.x_verified_at),
    xVerifiedAt: identity?.x_verified_at ?? null,
    walletLinked: Boolean(identity?.reward_wallet),
    rewardWallet: identity?.reward_wallet ?? null,
    walletVerified: Boolean(identity?.wallet_verified_at),
    walletVerifiedAt: identity?.wallet_verified_at ?? null,
    tokenAccountReady: Boolean(identity?.fawkq_token_account),
    xpByCycle,
    totalXp: xpByCycle.reduce((total, row) => total + row.xp, 0),
    todayXp: Number(dailyXp.overall || 0),
    todayXpByBucket: {
      participation: Number(dailyXp.participation || 0),
      mission: Number(dailyXp.mission || 0),
      other: Number(dailyXp.other || 0),
    },
    xpByBucket,
    recentActivity: ledgerRows.map((row) => ({
      id: row.id,
      cycleId: Number(row.cycle_id),
      source: row.source,
      bucket: row.cap_bucket,
      amount: Number(row.amount || 0),
      missionCode: row.mission_code,
      awardedAt: row.awarded_at,
    })),
    completedMissionCodes,
    completedMissionCount: completedMissionCodes.length,
    allocationBaseUnits,
    allocationByCategory,
    rewards: {
      recorded: allocationRows.length > 0,
      allocatedBaseUnits: allocationBaseUnits,
      scheduledBaseUnits: releaseRows.length ? sumBaseUnits(scheduledReleases) : null,
      distributedBaseUnits: releaseRows.length ? sumBaseUnits(distributedReleases) : null,
      failedBaseUnits: releaseRows.length ? sumBaseUnits(failedReleases) : null,
      releaseCount: releaseRows.length,
      releases: releaseRows.map((row) => {
        const allocation = allocationById.get(String(row.allocation_id));
        return {
          category: allocation?.category ?? 'other',
          cycleId: allocation?.cycle_id == null ? null : Number(allocation.cycle_id),
          percent: Number(row.pct),
          scheduledAt: row.scheduled_at,
          amountBaseUnits: String(row.amount_base_units ?? 0),
          status: row.status,
        };
      }),
    },
    buyToEarn: positionRows[0] ?? null,
    campaignState: campaignRows[0]?.state ?? 'DRAFT',
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
    enrolledAt: null, xVerifiedAt: null, walletVerifiedAt: null,
    walletVerified: false, rewardWallet: null, tokenAccountReady: false, xpByCycle: [], totalXp: 0,
    todayXp: 0, todayXpByBucket: { participation: 0, mission: 0, other: 0 },
    xpByBucket: { participation: 0, mission: 0, other: 0 }, recentActivity: [],
    completedMissionCodes: [], completedMissionCount: 0, allocationBaseUnits: null,
    allocationByCategory: {}, rewards: { recorded: false, allocatedBaseUnits: null,
      scheduledBaseUnits: null, distributedBaseUnits: null, failedBaseUnits: null,
      releaseCount: 0, releases: [] }, buyToEarn: null, campaignState: 'DRAFT',
    unavailable: true,
  };
}

export function closedRaidStatus() {
  return {
    events: [], verifiedActions: 0, pendingActions: 0, rejectedActions: 0,
    unavailable: true,
  };
}
