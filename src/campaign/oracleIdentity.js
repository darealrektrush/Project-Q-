const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RANK_ASSET_PATTERN = /^crab_army_rank_(0[1-9]|[1-4][0-9]|50)$/;

function boundedText(value, max = 80) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max
    ? value : null;
}

function parseCrabArmyProjection(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const level = Number(value.level);
  const lifetimeXp = Number(value.lifetime_xp);
  const progressPct = Number(value.progress_pct);
  const xpToNext = value.xp_to_next == null ? null : Number(value.xp_to_next);
  const nextRankXp = value.next_rank_xp == null ? null : Number(value.next_rank_xp);
  const ladderVersion = Number(value.ladder_version);
  const rankName = boundedText(value.rank_name);
  const division = boundedText(value.division);
  const nextRankName = value.next_rank_name == null ? null : boundedText(value.next_rank_name);
  const badgeAssetKey = boundedText(value.badge_asset_key, 64);

  if (!Number.isInteger(level) || level < 1 || level > 50 ||
      !Number.isSafeInteger(lifetimeXp) || lifetimeXp < 0 ||
      !Number.isInteger(progressPct) || progressPct < 0 || progressPct > 100 ||
      (xpToNext != null && (!Number.isSafeInteger(xpToNext) || xpToNext < 0)) ||
      (nextRankXp != null && (!Number.isSafeInteger(nextRankXp) || nextRankXp < 0)) ||
      !Number.isInteger(ladderVersion) || ladderVersion < 1 ||
      !rankName || !division || !badgeAssetKey || !RANK_ASSET_PATTERN.test(badgeAssetKey) ||
      (value.next_rank_name != null && !nextRankName)) return null;

  return {
    lifetimeXp,
    level,
    rankName,
    division,
    progressPct,
    xpToNext,
    nextRankName,
    nextRankXp,
    badgeAssetKey,
    ladderVersion,
  };
}

export async function ensureCampaignProfile(client, {
  campaignId,
  telegramUserId,
}, { env = process.env, fetchImpl = fetch, waitImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  if (typeof campaignId !== 'string' || !campaignId.trim()) {
    throw new Error('invalid campaign identity request');
  }
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
    throw new Error('invalid campaign identity request');
  }

  let url;
  try {
    url = new URL(env.ORACLE_PROJECT_Q_IDENTITY_URL ?? '');
  } catch {
    throw new Error('Oracle campaign identity unavailable');
  }
  const secret = String(env.ORACLE_PROJECT_Q_EVENT_SECRET ?? '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !url.pathname.endsWith('/platform/integrations/project-q/identity/resolve') ||
      secret.length < 32 || secret.trim() !== secret) {
    throw new Error('Oracle campaign identity unavailable');
  }
  let response = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        redirect: 'error',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, telegram_user_id: telegramUserId }),
        signal: AbortSignal.timeout(7_000),
      });
    } catch {
      response = null;
    }
    if (response?.ok) break;
    const status = Number(response?.status || 0);
    const transient = !response || status === 408 || status === 429 || status >= 500;
    if (!transient || attempt === 2) throw new Error('Oracle campaign identity unavailable');
    await waitImpl(attempt === 0 ? 150 : 400);
  }
  if (!response?.ok) throw new Error('Oracle campaign identity unavailable');
  const raw = await response.text();
  if (raw.length > 16_384) throw new Error('Oracle campaign identity unavailable');
  let oracle;
  try { oracle = JSON.parse(raw); } catch { throw new Error('Oracle campaign identity unavailable'); }
  if (!UUID_PATTERN.test(oracle?.profile_id ?? '') || oracle?.telegram_verified !== true ||
      !['provisional', 'active'].includes(oracle?.profile_state)) {
    throw new Error('Oracle campaign identity unavailable');
  }
  const result = await client.rpc('record_project_q_campaign_profile', {
    p_campaign_id: campaignId,
    p_telegram_user_id: telegramUserId,
    p_profile_id: oracle.profile_id,
    p_profile_state: oracle.profile_state,
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || row.profile_id !== oracle.profile_id) throw new Error('Oracle campaign identity unavailable');

  return {
    profileId: oracle.profile_id,
    profileState: oracle.profile_state,
    telegramVerified: true,
    crabArmy: parseCrabArmyProjection(oracle.crab_army),
  };
}

export function validateOracleWalletEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => ![
        'telegram_user_id', 'wallet_address', 'verified_at',
      ].includes(key))) {
    throw new Error('invalid Oracle wallet event');
  }
  const telegramUserId = body.telegram_user_id;
  const walletAddress = typeof body.wallet_address === 'string' ? body.wallet_address.trim() : '';
  const verifiedAt = new Date(body.verified_at);
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0 ||
      !WALLET_PATTERN.test(walletAddress) || !Number.isFinite(verifiedAt.getTime())) {
    throw new Error('invalid Oracle wallet event');
  }
  return { telegramUserId, walletAddress, verifiedAt: verifiedAt.toISOString() };
}

export async function recordOracleWallet(client, event, campaignId) {
  const result = await client.rpc('record_oracle_verified_wallet', {
    p_campaign_id: campaignId,
    p_telegram_user_id: event.telegramUserId,
    p_wallet_address: event.walletAddress,
    p_verified_at: event.verifiedAt,
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || row.reward_wallet !== event.walletAddress || !row.wallet_verified_at) {
    throw new Error('Oracle wallet event was not recorded');
  }
  return row;
}
