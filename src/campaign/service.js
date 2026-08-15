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
    walletVerified: false, tokenAccountReady: false, xpByCycle: [], totalXp: 0,
    unavailable: true,
  };
}

export function closedRaidStatus() {
  return {
    events: [], verifiedActions: 0, pendingActions: 0, rejectedActions: 0,
    unavailable: true,
  };
}
