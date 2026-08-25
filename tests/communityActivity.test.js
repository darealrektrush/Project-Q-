import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  COMMUNITY_ACTIVITY_RULES,
  buildCommunityMessageEvent,
  ingestCommunityMessage,
  rankCommunityDay,
  scoreCommunityParticipant,
} from '../src/campaign/communityActivity.js';

const env = {
  PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED: 'true',
  PROJECT_Q_COMMUNITY_ACTIVITY_HASH_SECRET: 'test-only-secret',
  PROJECT_Q_COMMUNITY_CHAT_ID: '-100123',
  PROJECT_Q_ACTIVITY_EXCLUDED_TELEGRAM_IDS: '99,100',
  BOND_THE_DUCK_CAMPAIGN_ID: 'bond-test',
};

function message(overrides = {}) {
  return {
    chat: { id: -100123 }, from: { id: 42, is_bot: false }, message_id: 7,
    date: Date.parse('2026-08-25T16:15:00Z') / 1000,
    text: 'A useful and original community contribution',
    ...overrides,
  };
}

test('Community Pulse produces privacy-preserving evidence only for the configured community', () => {
  const event = buildCommunityMessageEvent(message(), env);
  assert.equal(event.campaignId, 'bond-test');
  assert.equal(event.chatId, '-100123');
  assert.equal(event.telegramUserId, '42');
  assert.equal(event.localDay, '2026-08-25');
  assert.match(event.contentHash, /^[0-9a-f]{64}$/);
  assert.equal('text' in event, false);
  assert.equal(buildCommunityMessageEvent(message({ chat: { id: -100999 } }), env), null);
  assert.equal(buildCommunityMessageEvent(message(), { ...env, PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED: 'false' }), null);
});

test('Community Pulse ignores commands, bots, excluded users and low-content posts', () => {
  assert.equal(buildCommunityMessageEvent(message({ text: '/campaign now please' }), env), null);
  assert.equal(buildCommunityMessageEvent(message({ from: { id: 42, is_bot: true } }), env), null);
  assert.equal(buildCommunityMessageEvent(message({ from: { id: 99, is_bot: false } }), env), null);
  assert.equal(buildCommunityMessageEvent(message({ text: 'gm fam' }), env), null);
});

test('Community Pulse recognizes a genuine reply without counting self-replies', () => {
  const reply = buildCommunityMessageEvent(message({ reply_to_message: { from: { id: 55 } } }), env);
  const selfReply = buildCommunityMessageEvent(message({ reply_to_message: { from: { id: 42 } } }), env);
  assert.equal(reply.replyToUserId, '55');
  assert.equal(selfReply.replyToUserId, null);
});

function activity(user, minute, window, reply = false) {
  return {
    telegram_user_id: String(user), window_index: window,
    reply_to_user_id: reply ? '500' : null,
    sent_at: new Date(Date.parse('2026-08-25T00:00:00Z') + minute * 60000).toISOString(),
  };
}

test('Community Pulse requires spread, replies and five qualifying messages', () => {
  const eligible = [
    activity(1, 0, 0, true), activity(1, 31, 1), activity(1, 65, 2, true),
    activity(1, 121, 4), activity(1, 125, 4),
  ];
  assert.deepEqual(scoreCommunityParticipant(eligible), {
    messages: 5, windows: 4, replies: 2, spanMinutes: 125, eligible: true, score: 15,
  });
  assert.equal(scoreCommunityParticipant(eligible.slice(0, 4)).eligible, false);
  assert.equal(scoreCommunityParticipant(eligible.map((event) => ({ ...event, reply_to_user_id: null }))).eligible, false);
});

test('daily rankings award 8 XP maximum and deterministic Top 5 bonuses', () => {
  const events = [];
  for (let user = 1; user <= 6; user += 1) {
    for (const [index, minute] of [0, 31, 65, 121, 150].entries()) {
      events.push(activity(user, minute, index, index < 2));
    }
  }
  const ranked = rankCommunityDay(events);
  assert.deepEqual(ranked.map(({ rank, baseXp, rankXp }) => [rank, baseXp, rankXp]), [
    [1, 2, 6], [2, 2, 5], [3, 2, 4], [4, 2, 3], [5, 2, 2], [6, 2, 0],
  ]);
  assert.equal(COMMUNITY_ACTIVITY_RULES.maximumDailyXp, 8);
});

test('community message ingestion uses the server-only RPC contract', async () => {
  const calls = [];
  const client = { rpc: async (...args) => { calls.push(args); return { id: 1 }; } };
  const event = buildCommunityMessageEvent(message(), env);
  await ingestCommunityMessage(client, event);
  assert.equal(calls[0][0], 'ingest_campaign_community_message');
  assert.equal(calls[0][1].p_content_hash, event.contentHash);
  assert.equal(calls[0][1].p_telegram_user_id, '42');
});

test('Community Pulse migration is private, immutable and replay constrained', async () => {
  const sql = await readFile(new URL(
    '../supabase/migrations/20260825064719_community_pulse_and_x_invites.sql', import.meta.url
  ), 'utf8');
  assert.match(sql, /unique \(campaign_id, chat_id, message_id\)/i);
  assert.match(sql, /unique \(campaign_id, telegram_user_id, local_day, content_hash\)/i);
  assert.match(sql, /campaign_community_messages_immutable/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on public\.campaign_community_messages[\s\S]*from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.ingest_campaign_community_message[\s\S]*to service_role/i);
});
