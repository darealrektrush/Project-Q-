const WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const SOURCE_EVENT_PATTERN = /^[A-Za-z0-9:_-]{8,160}$/;
const VENUE_PATTERN = /^[a-z0-9][a-z0-9:_-]{1,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITS_PATTERN = /^[0-9]+$/;

export const BUY_TO_EARN_TIER_1_LAMPORTS = 70_000_000n;
export const BUY_TO_EARN_TIER_2_LAMPORTS = 200_000_000n;

function requiredDigits(value, field) {
  const normalized = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : String(value ?? '').trim();
  if (!DIGITS_PATTERN.test(normalized) || BigInt(normalized) <= 0n) {
    throw new Error(`invalid ${field}`);
  }
  return normalized;
}

export function validateOracleBuyToEarnTradeEvent(body) {
  const telegramUserId = Number(body?.telegram_user_id);
  const profileId = String(body?.profile_id ?? '').trim();
  const rewardWallet = String(body?.wallet_address ?? '').trim();
  const sourceEventId = String(body?.source_event_id ?? '').trim();
  const txSignature = String(body?.tx_signature ?? '').trim();
  const slot = Number(body?.slot);
  const blockTime = new Date(body?.block_time);
  const direction = String(body?.direction ?? '').trim().toUpperCase();
  const venueKey = String(body?.venue_key ?? '').trim().toLowerCase();
  const route = body?.route == null ? null : String(body.route).trim();

  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0
    || !UUID_PATTERN.test(profileId)
    || !WALLET_PATTERN.test(rewardWallet)
    || !SOURCE_EVENT_PATTERN.test(sourceEventId)
    || !SIGNATURE_PATTERN.test(txSignature)
    || !Number.isSafeInteger(slot) || slot <= 0
    || !Number.isFinite(blockTime.getTime())
    || !['BUY', 'SELL'].includes(direction)
    || !VENUE_PATTERN.test(venueKey)
    || (route !== null && (!route || route.length > 240))) {
    throw new Error('invalid Oracle Buy-to-Earn trade event');
  }

  return {
    telegramUserId,
    profileId,
    rewardWallet,
    sourceEventId,
    txSignature,
    slot,
    blockTime: blockTime.toISOString(),
    direction,
    solLamports: requiredDigits(body?.sol_lamports, 'Buy-to-Earn SOL amount'),
    tokenBaseUnits: requiredDigits(body?.token_base_units, 'Buy-to-Earn token amount'),
    venueKey,
    route,
  };
}

export async function ingestOracleBuyToEarnTrade(client, event, campaignId = 'bond-the-duck-2026') {
  const result = await client.rpc('ingest_campaign_buy_to_earn_trade', {
    p_campaign_id: campaignId,
    p_telegram_user_id: event.telegramUserId,
    p_profile_id: event.profileId,
    p_reward_wallet: event.rewardWallet,
    p_source_event_id: event.sourceEventId,
    p_tx_signature: event.txSignature,
    p_slot: event.slot,
    p_block_time: event.blockTime,
    p_direction: event.direction,
    p_sol_lamports: event.solLamports,
    p_token_base_units: event.tokenBaseUnits,
    p_venue_key: event.venueKey,
    p_route: event.route,
  });
  return Array.isArray(result) ? result[0] ?? null : result;
}
