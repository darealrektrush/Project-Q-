import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getXInviteStatus, ingestXInviteEvent, validateXInviteEvent } from '../src/campaign/xInvite.js';

const env = {
  BOND_THE_DUCK_CAMPAIGN_ID: 'bond-test',
  FAWKQ_BOND_CAMPAIGN_POST_ID: '1000',
  FAWKQ_OFFICIAL_X_USER_ID: '999',
};
const body = {
  telegramUserId: '42', xUserId: '200', replyPostId: '1001',
  conversationId: '1000', referencedPostId: '1000',
  referencedType: 'replied_to',
  mentions: [
    { userId: '301', username: '@Alpha' },
    { userId: '302', username: 'Beta' },
    { userId: '303', username: 'Gamma' },
  ],
  verifiedAt: new Date().toISOString(),
};

test('X invite validation binds one reply to the configured post and exactly three people', () => {
  const event = validateXInviteEvent(body, env);
  assert.equal(event.campaignId, 'bond-test');
  assert.equal(event.mainPostId, '1000');
  assert.equal(event.referencedType, 'replied_to');
  assert.equal(event.mentions.length, 3);
  assert.deepEqual(event.mentions.map(({ username }) => username), ['alpha', 'beta', 'gamma']);
  assert.match(event.idempotencyKey, /^[0-9a-f]{64}$/);
});

test('X invite rejects the wrong conversation target and invalid mention sets', () => {
  assert.throws(() => validateXInviteEvent({ ...body, conversationId: '2000' }, env), /invalid campaign reply target/);
  assert.throws(() => validateXInviteEvent({ ...body, referencedType: 'quoted' }, env), /invalid campaign reference type/);
  assert.throws(() => validateXInviteEvent({ ...body, mentions: body.mentions.slice(0, 2) }, env), /invalid friend mentions/);
  assert.throws(() => validateXInviteEvent({ ...body, mentions: [...body.mentions, { userId: '304', username: 'delta' }] }, env), /invalid friend mentions/);
  assert.throws(() => validateXInviteEvent({ ...body, mentions: [
    body.mentions[0], body.mentions[1], { userId: '200', username: 'self' }, { userId: '999', username: 'fawkq' },
  ] }, env), /invalid friend mentions/);
});

test('X invite ingestion passes structured proof to one server RPC', async () => {
  const calls = [];
  const client = { rpc: async (...args) => { calls.push(args); return { id: 2 }; } };
  const event = validateXInviteEvent(body, env);
  await ingestXInviteEvent(client, event);
  assert.equal(calls[0][0], 'ingest_campaign_x_invite');
  assert.equal(calls[0][1].p_main_post_id, '1000');
  assert.equal(calls[0][1].p_mentions.length, 3);
});

test('X invite status exposes verification without leaking mentioned identities', async () => {
  const client = { select: async () => [{
    reply_post_id: '1001', verified_at: '2026-08-25T12:00:00Z', bonus_xp_ledger_id: null,
  }] };
  assert.deepEqual(await getXInviteStatus(client, '42', { id: 'bond-test' }), {
    verified: true, replyPostId: '1001', verifiedAt: '2026-08-25T12:00:00Z', bonusXp: 5, bonusAwarded: false,
  });
});

test('X invite evidence is one-time, private and tied to verified identity', async () => {
  const sql = await readFile(new URL(
    '../supabase/migrations/20260825064719_community_pulse_and_x_invites.sql', import.meta.url
  ), 'utf8');
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(sql, /unique \(campaign_id, telegram_user_id\)/i);
  assert.match(sql, /unique \(campaign_id, reply_post_id\)/i);
  assert.match(sql, /x_user_id = p_x_user_id[\s\S]*x_verified_at is not null/i);
  assert.match(sql, /jsonb_array_length\(p_mentions\) <> 3/i);
  assert.match(sql, /campaign_x_invite_events_immutable/i);
  assert.match(sql, /grant execute on function public\.ingest_campaign_x_invite[\s\S]*to service_role/i);
  assert.match(server, /app\.post\('\/oracle\/campaign-x-invite'/);
  assert.match(server, /secretMatches\(req\.get\('x-oracle-campaign-secret'\), ORACLE_CAMPAIGN_SECRET\)/);
});
