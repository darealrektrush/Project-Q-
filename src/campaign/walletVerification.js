import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function buildWalletChallengeMessage({ campaignId, telegramUserId, nonce, expiresAt }) {
  return [
    'Project Q wallet verification',
    `Campaign: ${campaignId}`,
    `Telegram user: ${telegramUserId}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
    '',
    'Signing proves wallet ownership. It does not authorize a transaction.',
  ].join('\n');
}

export async function createWalletChallenge(client, campaignId, telegramUserId, now = new Date()) {
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  await client.insert('wallet_challenges', [{
    campaign_id: campaignId,
    telegram_user_id: String(telegramUserId),
    nonce,
    created_at: now.toISOString(),
    expires_at: expiresAt,
  }]);
  return { nonce, expiresAt, message: buildWalletChallengeMessage({ campaignId, telegramUserId, nonce, expiresAt }) };
}

export function verifySolanaWalletSignature(wallet, message, signatureBase64) {
  let publicKey;
  let signature;
  try {
    publicKey = new PublicKey(wallet);
    signature = Buffer.from(signatureBase64, 'base64');
  } catch {
    return false;
  }
  if (!PublicKey.isOnCurve(publicKey.toBytes()) || signature.length !== 64) return false;
  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey.toBytes())]),
    format: 'der',
    type: 'spki',
  });
  return verify(null, Buffer.from(message, 'utf8'), key, signature);
}

export async function consumeWalletChallenge(client, { campaignId, telegramUserId, nonce, wallet, signature }, now = new Date()) {
  if (typeof nonce !== 'string' || nonce.length > 128 || typeof wallet !== 'string' || wallet.length > 64 ||
      typeof signature !== 'string' || signature.length > 256) throw new Error('invalid wallet verification');
  const rows = await client.select('wallet_challenges',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    `&nonce=eq.${encodeURIComponent(nonce)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(now.toISOString())}` +
    '&select=id,expires_at&limit=1');
  const challenge = rows[0];
  if (!challenge) throw new Error('wallet challenge unavailable');
  const message = buildWalletChallengeMessage({
    campaignId, telegramUserId, nonce, expiresAt: challenge.expires_at,
  });
  if (!verifySolanaWalletSignature(wallet, message, signature)) throw new Error('invalid wallet signature');

  const consumed = await client.update('wallet_challenges', `?id=eq.${challenge.id}&consumed_at=is.null`, {
    consumed_at: now.toISOString(),
  });
  if (!consumed?.length) throw new Error('wallet challenge already consumed');
  await client.upsert('identity_links', [{
    campaign_id: campaignId,
    telegram_user_id: String(telegramUserId),
    reward_wallet: wallet,
    wallet_verified_at: now.toISOString(),
  }], 'campaign_id,telegram_user_id');
  return { wallet, verifiedAt: now.toISOString() };
}
