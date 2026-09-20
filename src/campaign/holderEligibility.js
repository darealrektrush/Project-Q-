import { createHash } from 'node:crypto';

import { getTokenPriceUsd } from '../lib/solana.js';
import { FAWKQ_DECIMALS, FAWKQ_MINT, getFawkqWalletStatus } from './walletStatus.js';

export const HOLDER_PRICE_SCALE = 12;
export const HOLDER_MINIMUM_USD_CENTS = 200;

function decimalToScaledInteger(value, scale = HOLDER_PRICE_SCALE) {
  const text = String(value ?? '').trim().toLowerCase();
  const match = text.match(/^([+]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/);
  if (!match) throw new Error('invalid FAWKQ USD price');
  const intPart = match[2] || '0';
  const fracPart = match[3] || '';
  const exponent = Number(match[4] || 0);
  if (!Number.isSafeInteger(exponent) || exponent < -100 || exponent > 100) {
    throw new Error('invalid FAWKQ USD price');
  }
  const digits = BigInt((intPart + fracPart).replace(/^0+(?=\d)/, '') || '0');
  if (digits <= 0n) throw new Error('invalid FAWKQ USD price');
  const shift = scale + exponent - fracPart.length;
  return shift >= 0
    ? digits * (10n ** BigInt(shift))
    : digits / (10n ** BigInt(-shift));
}

function holderThresholdProduct({
  priceScale = HOLDER_PRICE_SCALE,
  tokenDecimals = FAWKQ_DECIMALS,
  minimumUsdCents = HOLDER_MINIMUM_USD_CENTS,
} = {}) {
  // balanceRaw * priceScaled * 100 >= minimumCents * 10^tokenDecimals * 10^priceScale
  return BigInt(minimumUsdCents)
    * (10n ** BigInt(tokenDecimals))
    * (10n ** BigInt(priceScale));
}

export function evaluateHolderEligibility({
  balanceBaseUnits,
  priceUsd,
  tokenAccount,
  priceScale = HOLDER_PRICE_SCALE,
} = {}) {
  if (!/^\d+$/.test(String(balanceBaseUnits ?? ''))) throw new Error('invalid FAWKQ balance');
  const balance = BigInt(balanceBaseUnits);
  const priceScaled = decimalToScaledInteger(priceUsd, priceScale);
  if (priceScaled <= 0n) throw new Error('invalid FAWKQ USD price');
  const left = balance * priceScaled * 100n;
  const right = holderThresholdProduct({ priceScale });
  return {
    eligible: Boolean(tokenAccount) && left >= right,
    balanceBaseUnits: balance.toString(),
    priceUsdScaled: priceScaled.toString(),
    priceScale,
    minimumUsdCents: HOLDER_MINIMUM_USD_CENTS,
    tokenAccount: tokenAccount || null,
  };
}

export async function verifyFawkqHolderEligibility(connection, wallet, {
  now = new Date(),
  priceLoader = getTokenPriceUsd,
} = {}) {
  const walletStatus = await getFawkqWalletStatus(connection, wallet, { now });
  const priceUsd = await priceLoader(FAWKQ_MINT);
  if (priceUsd == null) throw new Error('FAWKQ USD price unavailable');
  const eligibility = evaluateHolderEligibility({
    balanceBaseUnits: walletStatus.balanceBaseUnits,
    priceUsd,
    tokenAccount: walletStatus.primaryTokenAccount,
  });
  return {
    ...walletStatus,
    ...eligibility,
    priceSource: 'HELIUS_DAS',
  };
}

export function holderEligibilityIdempotencyKey({
  campaignId,
  telegramUserId,
  profileId,
  wallet,
  balanceBaseUnits,
  priceUsdScaled,
  priceScale,
  observedAt,
} = {}) {
  const values = [
    campaignId, telegramUserId, profileId, wallet,
    balanceBaseUnits, priceUsdScaled, priceScale, observedAt,
  ].map((value) => String(value ?? '').trim());
  if (values.some((value) => !value)) throw new Error('invalid holder eligibility identity');
  return createHash('sha256').update(values.join(':')).digest('hex');
}

export async function recordHolderEligibility(client, {
  campaignId,
  telegramUserId,
  profileId,
  rewardWallet,
  verification,
} = {}) {
  const idempotencyKey = holderEligibilityIdempotencyKey({
    campaignId,
    telegramUserId,
    profileId,
    wallet: rewardWallet,
    balanceBaseUnits: verification.balanceBaseUnits,
    priceUsdScaled: verification.priceUsdScaled,
    priceScale: verification.priceScale,
    observedAt: verification.observedAt,
  });
  const result = await client.rpc('record_campaign_holder_eligibility', {
    p_campaign_id: campaignId,
    p_telegram_user_id: telegramUserId,
    p_profile_id: profileId,
    p_reward_wallet: rewardWallet,
    p_token_account: verification.tokenAccount,
    p_balance_base_units: verification.balanceBaseUnits,
    p_price_usd_scaled: verification.priceUsdScaled,
    p_price_scale: verification.priceScale,
    p_observed_at: verification.observedAt,
    p_idempotency_key: idempotencyKey,
  });
  const row = Array.isArray(result) ? result[0] ?? null : result;
  if (!row) throw new Error('holder eligibility was not recorded');
  return row;
}
