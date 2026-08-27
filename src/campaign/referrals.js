import { randomBytes } from 'node:crypto';

import { DEFAULT_CAMPAIGN_ID } from './service.js';
import { VERIFIED_REFERRAL_BONUS_XP, X_INVITE_BONUS_XP } from './rewardValues.js';

const REFERRAL_CODE_PATTERN = /^[a-z0-9_-]{8,24}$/;

function campaignId() {
  return process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

export function parseReferralPayload(payload) {
  const match = /^ref_([a-z0-9_-]{8,24})$/i.exec(String(payload ?? '').trim());
  return match ? match[1].toLowerCase() : null;
}

export function buildReferralLink(code, botUsername = process.env.TELEGRAM_BOT_USERNAME) {
  if (!REFERRAL_CODE_PATTERN.test(String(code ?? ''))) return null;
  const username = String(botUsername ?? '').trim().replace(/^@/, '');
  return username ? `https://t.me/${username}?start=ref_${code}` : null;
}

function makeCode() {
  return randomBytes(9).toString('base64url').toLowerCase();
}

async function loadCode(client, id, telegramUserId) {
  const rows = await client.select(
    'campaign_referral_codes',
    `?campaign_id=eq.${encodeURIComponent(id)}` +
      `&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      '&select=code,created_at&limit=1'
  );
  return rows[0] ?? null;
}

export async function getOrCreateReferralCode(
  client,
  telegramUserId,
  { id = campaignId(), codeFactory = makeCode, botUsername = process.env.TELEGRAM_BOT_USERNAME } = {}
) {
  const existing = await loadCode(client, id, telegramUserId);
  if (existing) return { ...existing, link: buildReferralLink(existing.code, botUsername) };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = String(codeFactory()).toLowerCase();
    if (!REFERRAL_CODE_PATTERN.test(code)) throw new Error('invalid generated referral code');
    try {
      const rows = await client.insert('campaign_referral_codes', [{
        campaign_id: id,
        telegram_user_id: String(telegramUserId),
        code,
      }]);
      const created = rows[0];
      return { ...created, link: buildReferralLink(created.code, botUsername) };
    } catch (error) {
      const raced = await loadCode(client, id, telegramUserId);
      if (raced) return { ...raced, link: buildReferralLink(raced.code, botUsername) };
      if (attempt === 2) throw error;
    }
  }
  throw new Error('referral code unavailable');
}

export async function captureReferral(client, payload, referredTelegramUserId, { id = campaignId() } = {}) {
  const code = parseReferralPayload(payload);
  if (!code) throw new Error('invalid referral link');
  return client.rpc('capture_campaign_referral', {
    p_campaign_id: id,
    p_referral_code: code,
    p_referred_user_id: String(referredTelegramUserId),
  });
}

function emptyCounts() {
  return { invited: 0, verifying: 0, purchasePending: 0, participationPending: 0, qualified: 0, bonusAwarded: 0 };
}

export function summarizeReferrals(rows = []) {
  return rows.reduce((counts, row) => {
    counts.invited += 1;
    if (row.bonus_xp_ledger_id) counts.bonusAwarded += 1;
    if (row.qualified_at) counts.qualified += 1;
    else if (row.purchase_verified_at && row.first_xp_ledger_id) counts.qualified += 1;
    else if (row.purchase_verified_at) counts.participationPending += 1;
    else if (row.identity_verified_at) counts.purchasePending += 1;
    else counts.verifying += 1;
    return counts;
  }, emptyCounts());
}

export async function getReferralProfile(
  client,
  telegramUserId,
  { id = campaignId(), botUsername = process.env.TELEGRAM_BOT_USERNAME, createCode = true } = {}
) {
  const code = createCode
    ? await getOrCreateReferralCode(client, telegramUserId, { id, botUsername })
    : await loadCode(client, id, telegramUserId);
  const rows = await client.select(
    'campaign_referrals',
    `?campaign_id=eq.${encodeURIComponent(id)}` +
      `&referrer_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      '&select=status,identity_verified_at,purchase_verified_at,first_xp_ledger_id,qualified_at,bonus_xp_ledger_id,accepted_at' +
      '&order=accepted_at.desc&limit=100'
  );
  return {
    code: code?.code ?? null,
    link: code?.code ? buildReferralLink(code.code, botUsername) : null,
    counts: summarizeReferrals(rows),
    bonusXp: VERIFIED_REFERRAL_BONUS_XP,
    xInviteBonusXp: X_INVITE_BONUS_XP,
    minimumPurchaseUsd: 2,
    qualification: ['IDENTITY_VERIFIED', 'PURCHASE_VERIFIED', 'FIRST_VERIFIED_XP'],
  };
}

export function closedReferralProfile() {
  return {
    code: null,
    link: null,
    counts: emptyCounts(),
    bonusXp: VERIFIED_REFERRAL_BONUS_XP,
    xInviteBonusXp: X_INVITE_BONUS_XP,
    minimumPurchaseUsd: 2,
    qualification: ['IDENTITY_VERIFIED', 'PURCHASE_VERIFIED', 'FIRST_VERIFIED_XP'],
    unavailable: true,
  };
}

export function evaluateReferralQualification({ referral, identity, purchases = [], xpRows = [] }) {
  const acceptedAt = Date.parse(referral?.accepted_at ?? '');
  const identityReady = Boolean(identity?.x_verified_at && identity?.wallet_verified_at);
  const purchase = purchases.find((row) =>
    Number(row.purchase_usd) >= 2 && Date.parse(row.purchased_at) >= acceptedAt && row.verified_at
  );
  const firstXp = xpRows.find((row) =>
    Number(row.amount) > 0 && Date.parse(row.awarded_at) >= acceptedAt && row.mission_code !== 'verified-referral'
  );
  return {
    qualified: Boolean(Number.isFinite(acceptedAt) && identityReady && purchase && firstXp),
    identityReady,
    purchaseReady: Boolean(purchase),
    participationReady: Boolean(firstXp),
    purchase: purchase ?? null,
    firstXp: firstXp ?? null,
  };
}

const STATUS_ORDER = Object.freeze({
  CAPTURED: 0,
  IDENTITY_VERIFIED: 1,
  PURCHASE_VERIFIED: 2,
  PARTICIPATED: 3,
  QUALIFIED: 4,
  BONUS_AWARDED: 5,
  REJECTED: 99,
});

export async function refreshReferralQualification(
  client,
  referredTelegramUserId,
  { id = campaignId(), now = new Date().toISOString() } = {}
) {
  const referralRows = await client.select(
    'campaign_referrals',
    `?campaign_id=eq.${encodeURIComponent(id)}` +
      `&referred_user_id=eq.${encodeURIComponent(String(referredTelegramUserId))}` +
      '&select=id,status,accepted_at,identity_verified_at,purchase_verified_at,qualifying_purchase_usd,qualifying_purchase_ref,first_xp_ledger_id,qualified_at,bonus_xp_ledger_id&limit=1'
  );
  const referral = referralRows[0];
  if (!referral || ['REJECTED', 'BONUS_AWARDED'].includes(referral.status)) return referral ?? null;

  const [identityRows, purchases, xpRows] = await Promise.all([
    client.select(
      'identity_links',
      `?campaign_id=eq.${encodeURIComponent(id)}` +
        `&telegram_user_id=eq.${encodeURIComponent(String(referredTelegramUserId))}` +
        '&select=x_verified_at,wallet_verified_at&limit=1'
    ),
    client.select(
      'campaign_referral_purchase_proofs',
      `?campaign_id=eq.${encodeURIComponent(id)}` +
        `&referred_user_id=eq.${encodeURIComponent(String(referredTelegramUserId))}` +
        '&select=id,purchase_ref,purchase_usd,purchased_at,verified_at&order=purchased_at.asc&limit=10'
    ),
    client.select(
      'xp_ledger',
      `?campaign_id=eq.${encodeURIComponent(id)}` +
        `&telegram_user_id=eq.${encodeURIComponent(String(referredTelegramUserId))}` +
        `&awarded_at=gte.${encodeURIComponent(referral.accepted_at)}` +
        '&amount=gt.0&select=id,amount,mission_code,awarded_at&order=awarded_at.asc&limit=10'
    ),
  ]);
  const identity = identityRows[0] ?? null;
  const evaluation = evaluateReferralQualification({ referral, identity, purchases, xpRows });
  let nextStatus = 'CAPTURED';
  if (evaluation.identityReady) nextStatus = 'IDENTITY_VERIFIED';
  if (evaluation.identityReady && evaluation.purchaseReady) nextStatus = 'PURCHASE_VERIFIED';
  if (evaluation.qualified) nextStatus = 'QUALIFIED';
  if ((STATUS_ORDER[referral.status] ?? 0) > STATUS_ORDER[nextStatus]) nextStatus = referral.status;

  const identityVerifiedAt = evaluation.identityReady
    ? [identity.x_verified_at, identity.wallet_verified_at].sort().at(-1)
    : referral.identity_verified_at;
  const patch = {
    status: nextStatus,
    identity_verified_at: identityVerifiedAt ?? null,
    purchase_verified_at: evaluation.purchase?.verified_at ?? referral.purchase_verified_at ?? null,
    qualifying_purchase_usd: evaluation.purchase?.purchase_usd ?? referral.qualifying_purchase_usd ?? null,
    qualifying_purchase_ref: evaluation.purchase?.purchase_ref ?? referral.qualifying_purchase_ref ?? null,
    first_xp_ledger_id: evaluation.firstXp?.id ?? referral.first_xp_ledger_id ?? null,
    qualified_at: evaluation.qualified ? (referral.qualified_at ?? now) : referral.qualified_at,
  };
  const rows = await client.update(
    'campaign_referrals',
    `?id=eq.${encodeURIComponent(String(referral.id))}`,
    patch
  );
  return rows[0] ?? { ...referral, ...patch };
}
