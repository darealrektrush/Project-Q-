import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRehearsalReadinessText, getRehearsalReadiness } from '../src/campaign/rehearsal.js';

function client({ campaign = [{ id: 'bond-the-duck-2026', state: 'DRAFT' }], cycles = [], sources = [{ source_key: 'vote_1' }] } = {}) {
  return {
    select: async (table) => ({ campaigns: campaign, cycles, verification_sources: sources })[table],
  };
}

const safeEnv = {
  TELEGRAM_FOUNDER_USER_IDS: '101,202',
  PROJECT_Q_CAMPAIGN_APP_URL: 'https://project-q.example/campaign-app/',
  TELEGRAM_BOT_TOKEN: 'telegram-secret-do-not-show',
  ORACLE_CAMPAIGN_SECRET: 'oracle-secret-do-not-show',
  HELIUS_RPC_URL: 'https://rpc.example/',
  TOKEN_MINT: 'mint',
  PROJECT_Q_CAMPAIGN_APP_ENABLED: 'false',
  PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'false',
  PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'false',
};

test('rehearsal can pass while campaign is draft, undated and launch-locked', async () => {
  const status = await getRehearsalReadiness(client(), safeEnv);
  assert.equal(status.ready, true);
  assert.equal(status.readyCount, 10);
  assert.match(buildRehearsalReadinessText(status), /ready for controlled rehearsal/);
  assert.doesNotMatch(buildRehearsalReadinessText(status), /secret-do-not-show/);
});

test('rehearsal fails closed for live flags, dates, missing bridge auth or non-HTTPS app URL', async () => {
  const status = await getRehearsalReadiness(client({
    cycles: [{ cycle_id: 1, opens_at: '2026-09-01T15:00:00Z', closes_at: '2026-09-03T15:00:00Z' }],
  }), {
    ...safeEnv,
    PROJECT_Q_CAMPAIGN_APP_URL: 'http://insecure.example/',
    ORACLE_CAMPAIGN_SECRET: '',
    PROJECT_Q_CAMPAIGN_APP_ENABLED: 'true',
  });
  assert.equal(status.ready, false);
  for (const key of ['timeline', 'app_url', 'oracle', 'launch_lock']) {
    assert.equal(status.checks.find((check) => check.key === key).ready, false);
  }
});

test('rehearsal fails closed when the campaign record or source rehearsal data is missing', async () => {
  const status = await getRehearsalReadiness(client({ campaign: [], sources: [] }), safeEnv);
  assert.equal(status.ready, false);
  assert.equal(status.campaignState, 'MISSING');
  assert.equal(status.checks.find((check) => check.key === 'database').ready, false);
  assert.equal(status.checks.find((check) => check.key === 'sources').ready, false);
});
