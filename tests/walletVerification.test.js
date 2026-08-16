import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import bs58 from 'bs58';
import { buildWalletChallengeMessage, consumeWalletChallenge, verifySolanaWalletSignature } from '../src/campaign/walletVerification.js';

test('wallet challenge states that signing does not authorize a transaction', () => {
  const message = buildWalletChallengeMessage({
    campaignId: 'bond-the-duck-2026', telegramUserId: 42, nonce: 'abc', expiresAt: '2026-08-16T00:10:00.000Z',
  });
  assert.match(message, /Signing proves wallet ownership/);
  assert.match(message, /does not authorize a transaction/);
});

test('Solana wallet verification accepts the owner signature and rejects tampering', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const wallet = bs58.encode(rawPublicKey);
  const message = 'Project Q verification message';
  const signature = sign(null, Buffer.from(message), privateKey).toString('base64');
  assert.equal(verifySolanaWalletSignature(wallet, message, signature), true);
  assert.equal(verifySolanaWalletSignature(wallet, `${message}!`, signature), false);
  assert.equal(verifySolanaWalletSignature('not-a-wallet', message, signature), false);
});

test('wallet verification consumes the nonce before linking the verified wallet', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const wallet = bs58.encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32));
  const expiresAt = '2026-08-16T00:10:00.000Z';
  const now = new Date('2026-08-16T00:05:00.000Z');
  const message = buildWalletChallengeMessage({ campaignId: 'bond', telegramUserId: 42, nonce: 'nonce', expiresAt });
  const signature = sign(null, Buffer.from(message), privateKey).toString('base64');
  const calls = [];
  const client = {
    select: async () => [{ id: 7, expires_at: expiresAt }],
    update: async (...args) => { calls.push(['update', ...args]); return [{ id: 7 }]; },
    upsert: async (...args) => { calls.push(['upsert', ...args]); return [{}]; },
  };
  const result = await consumeWalletChallenge(client, {
    campaignId: 'bond', telegramUserId: 42, nonce: 'nonce', wallet, signature,
  }, now);
  assert.equal(result.wallet, wallet);
  assert.equal(calls[0][0], 'update');
  assert.equal(calls[1][0], 'upsert');
  assert.equal(calls[1][2][0].wallet_verified_at, now.toISOString());
});
