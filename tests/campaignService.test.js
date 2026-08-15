import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCampaignStatus,
  getParticipantStatus,
  closedCampaignStatus,
  getParticipantRaidStatus,
} from '../src/campaign/service.js';

test('missing campaign row remains safely in DRAFT', async () => {
  const client = { select: async () => [] };
  assert.equal((await getCampaignStatus(client)).state, 'DRAFT');
});

test('Oracle raid events are summarized for Project Q campaign progress', async () => {
  const client = { select: async () => [
    { raid_id: 'r1', action: 'like', credited: true, reason: null },
    { raid_id: 'r1', action: 'reply', credited: false, reason: null },
    { raid_id: 'r2', action: 'retweet', credited: false, reason: 'duplicate' },
  ] };
  const status = await getParticipantRaidStatus(client, 123);
  assert.equal(status.verifiedActions, 1);
  assert.equal(status.pendingActions, 1);
  assert.equal(status.rejectedActions, 1);
});

test('participant status derives verification readiness and sums XP', async () => {
  const client = {
    select: async (table) => table === 'identity_links'
      ? [{
          x_user_id: 'x-1', reward_wallet: 'wallet-1', x_verified_at: '2026-08-14T00:00:00Z',
          wallet_verified_at: '2026-08-14T00:00:00Z', fawkq_token_account: 'ata-1',
        }]
      : [{ cycle_id: 1, xp: 12 }, { cycle_id: 2, xp: 7 }],
  };
  const status = await getParticipantStatus(client, 123);
  assert.equal(status.enrolled, true);
  assert.equal(status.walletVerified, true);
  assert.equal(status.tokenAccountReady, true);
  assert.equal(status.totalXp, 19);
});

test('closed fallback never reports live campaign state', () => {
  const status = closedCampaignStatus();
  assert.deepEqual({ state: status.state, unavailable: status.unavailable }, {
    state: 'DRAFT', unavailable: true,
  });
});
