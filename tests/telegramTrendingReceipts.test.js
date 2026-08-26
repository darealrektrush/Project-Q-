import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TELEGRAM_TRENDING_BOT_PROFILES,
  getTelegramTrendingReceiptSources,
  handleTelegramTrendingReceipt,
  ingestTelegramTrendingReceipt,
  isTelegramTrendingReceiptCandidate,
  recordTelegramTrendingReceiptContext,
  validateTelegramTrendingReceiptMessage,
} from '../src/campaign/telegramTrendingReceipts.js';

const enabled = { PROJECT_Q_TRENDING_RECEIPTS_ENABLED: 'true' };
const now = new Date('2026-09-02T12:00:00.000Z');
const epoch = (value) => Math.floor(new Date(value).getTime() / 1000);

const directSource = {
  sourceKey: 'telegram:majorbuybot', handle: '@MajorBuyBot', cooldownSeconds: 7200,
  telegramBotUserId: 7098195052, successMarkers: ['thanks for your vote', 'has been counted'],
  contextMarkers: ['fawkq'], receiptMaxAgeSeconds: 600, verificationMode: 'DIRECT_RECEIPT',
  pairMaxGapSeconds: null, accepting: true, status: 'AVAILABLE',
};
const pairedSource = {
  sourceKey: 'telegram:wtftrending', handle: '@WTFTrendingBot', cooldownSeconds: 3600,
  telegramBotUserId: 7812045152, successMarkers: ['your vote successfully added'],
  contextMarkers: ['vote for fawk q'], receiptMaxAgeSeconds: 600,
  verificationMode: 'PAIRED_CONTEXT', pairMaxGapSeconds: 300,
  accepting: true, status: 'AVAILABLE',
};

function forwardedMessage({
  participant = 123, botId = 7098195052,
  text = 'Thanks for your vote! Your vote for FAWKQ has been counted.',
  originalAt = '2026-09-02T11:58:00.000Z', forwardedAt = '2026-09-02T11:59:00.000Z',
} = {}) {
  return {
    chat: { id: participant, type: 'private' },
    from: { id: participant, is_bot: false },
    text,
    date: epoch(forwardedAt),
    forward_origin: {
      type: 'user',
      date: epoch(originalAt),
      sender_user: { id: botId, is_bot: true, username: 'mutable-name-ignored' },
    },
  };
}

test('five bot profiles use the recovered permanent source identities and cooldowns', () => {
  assert.deepEqual(TELEGRAM_TRENDING_BOT_PROFILES.map(({ sourceKey, cooldownSeconds }) => (
    [sourceKey, cooldownSeconds]
  )), [
    ['telegram:majorbuybot', 7200],
    ['telegram:wtftrending', 3600],
    ['telegram:trenchobot', 86400],
    ['telegram:bbtrendingbot', 3600],
    ['telegram:drokiatrendsbot', 3600],
  ]);
});

test('only private messages forwarded from a bot are receipt candidates', () => {
  assert.equal(isTelegramTrendingReceiptCandidate(forwardedMessage()), true);
  assert.equal(isTelegramTrendingReceiptCandidate({
    ...forwardedMessage(), chat: { id: -1, type: 'supergroup' },
  }), false);
  assert.equal(isTelegramTrendingReceiptCandidate({
    ...forwardedMessage(), forward_origin: { type: 'hidden_user', date: epoch(now) },
  }), false);
});

test('direct receipts bind numeric bot ID, success, FAWKQ context and fresh timestamps', () => {
  const receipt = validateTelegramTrendingReceiptMessage(
    forwardedMessage(), [directSource], { now, env: enabled }
  );
  assert.equal(receipt.kind, 'RECEIPT');
  assert.equal(receipt.originBotUserId, 7098195052);
  assert.equal(receipt.sourceKey, directSource.sourceKey);
  assert.match(receipt.receiptHash, /^[0-9a-f]{64}$/);
  assert.throws(() => validateTelegramTrendingReceiptMessage(
    forwardedMessage({ botId: 999 }), [directSource], { now, env: enabled }
  ), /not certified/);
  assert.throws(() => validateTelegramTrendingReceiptMessage(
    forwardedMessage({ text: 'Thanks for your vote!' }), [directSource], { now, env: enabled }
  ), /FAWKQ context/);
  assert.throws(() => validateTelegramTrendingReceiptMessage(
    forwardedMessage({ text: 'Your FAWKQ menu is ready.' }), [directSource], { now, env: enabled }
  ), /success marker/);
});

test('WTF uses a paired FAWKQ context followed by its token-generic success receipt', () => {
  const context = validateTelegramTrendingReceiptMessage(forwardedMessage({
    botId: pairedSource.telegramBotUserId,
    text: 'Welcome to WTF Trending Voting Agent! Vote for Fawk Q',
  }), [pairedSource], { now, env: enabled });
  const receipt = validateTelegramTrendingReceiptMessage(forwardedMessage({
    botId: pairedSource.telegramBotUserId,
    text: 'Your vote Successfully added! You can vote in 1 Hours again.',
  }), [pairedSource], { now, env: enabled });
  assert.equal(context.kind, 'CONTEXT');
  assert.equal(receipt.kind, 'RECEIPT');
});

test('receipt freshness is enforced and a receipt hash cannot be participant-bound', () => {
  assert.throws(() => validateTelegramTrendingReceiptMessage(forwardedMessage({
    originalAt: '2026-09-02T11:40:00.000Z',
  }), [directSource], { now, env: enabled }), /outside the certified forwarding window/);
  const first = validateTelegramTrendingReceiptMessage(
    forwardedMessage({ participant: 123 }), [directSource], { now, env: enabled }
  );
  const shared = validateTelegramTrendingReceiptMessage(
    forwardedMessage({ participant: 999 }), [directSource], { now, env: enabled }
  );
  assert.equal(first.receiptHash, shared.receiptHash);
});

test('source state fails closed without exact config and a current healthy latest certification', async () => {
  const client = {
    select: async (table) => {
      if (table === 'verification_sources') return [{
        campaign_id: 'bond-the-duck-2026', source_key: directSource.sourceKey,
        source: 'event', classification: 'PROOF_SUPPORTED', cooldown_seconds: 7200,
      }];
      if (table === 'verification_source_certifications') return [{
        id: 1, source_key: directSource.sourceKey, source_kind: 'TELEGRAM_BOT',
        classification: 'PROOF_SUPPORTED', health: 'HEALTHY',
        checked_at: '2026-09-02T11:00:00Z', expires_at: '2026-09-04T11:00:00Z',
      }];
      if (table === 'telegram_trending_source_configs') return [{
        id: 1, source_key: directSource.sourceKey, telegram_bot_user_id: 7098195052,
        verification_mode: 'DIRECT_RECEIPT', success_markers: directSource.successMarkers,
        context_markers: directSource.contextMarkers, receipt_max_age_seconds: 600,
        pair_max_gap_seconds: null, evidence_hash: 'a'.repeat(64),
        configured_at: '2026-09-02T10:00:00Z',
      }];
      return [];
    },
  };
  const sources = await getTelegramTrendingReceiptSources(client, { now });
  assert.equal(sources.find(({ sourceKey }) => sourceKey === directSource.sourceKey).status, 'AVAILABLE');
  assert.equal(sources.filter(({ accepting }) => accepting).length, 1);
  assert.equal(sources.find(({ sourceKey }) => sourceKey === 'telegram:wtftrending').status, 'REGISTRY_BLOCKED');
});

test('context and receipt RPC calls use only the validated evidence fields', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push({ fn, args }); return [{ id: 7 }]; } };
  const receipt = validateTelegramTrendingReceiptMessage(
    forwardedMessage(), [directSource], { now, env: enabled }
  );
  await ingestTelegramTrendingReceipt(client, receipt, { env: enabled });
  assert.equal(calls[0].fn, 'ingest_telegram_trending_receipt');
  assert.equal(calls[0].args.p_origin_bot_user_id, 7098195052);
  const context = validateTelegramTrendingReceiptMessage(forwardedMessage({
    botId: pairedSource.telegramBotUserId,
    text: 'Vote for Fawk Q',
  }), [pairedSource], { now, env: enabled });
  await recordTelegramTrendingReceiptContext(client, context, { env: enabled });
  assert.equal(calls[1].fn, 'record_telegram_trending_receipt_context');
});

test('handler stores paired context before attempting a participation event', async () => {
  const calls = [];
  const client = {
    select: async (table) => {
      if (table === 'verification_sources') return [{
        campaign_id: 'bond-the-duck-2026', source_key: pairedSource.sourceKey,
        source: 'event', classification: 'PROOF_SUPPORTED', cooldown_seconds: 3600,
      }];
      if (table === 'verification_source_certifications') return [{
        id: 1, source_key: pairedSource.sourceKey, source_kind: 'TELEGRAM_BOT',
        classification: 'PROOF_SUPPORTED', health: 'HEALTHY',
        checked_at: '2026-09-02T11:00:00Z', expires_at: '2026-09-04T11:00:00Z',
      }];
      if (table === 'telegram_trending_source_configs') return [{
        id: 1, source_key: pairedSource.sourceKey,
        telegram_bot_user_id: pairedSource.telegramBotUserId,
        verification_mode: 'PAIRED_CONTEXT', success_markers: pairedSource.successMarkers,
        context_markers: pairedSource.contextMarkers, receipt_max_age_seconds: 600,
        pair_max_gap_seconds: 300, evidence_hash: 'b'.repeat(64),
        configured_at: '2026-09-02T10:00:00Z',
      }];
      return [];
    },
    rpc: async (fn, args) => { calls.push({ fn, args }); return [{ id: 9 }]; },
  };
  const result = await handleTelegramTrendingReceipt(client, forwardedMessage({
    botId: pairedSource.telegramBotUserId,
    text: 'Welcome. Vote for Fawk Q',
  }), { now, env: enabled });
  assert.equal(result.contextStored, true);
  assert.equal(calls[0].fn, 'record_telegram_trending_receipt_context');
});
