import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLaunchSystemText, getLaunchSystemStatus } from '../src/campaign/launchSystems.js';

test('launch systems fail closed unless flags are exactly true', () => {
  const status = getLaunchSystemStatus({
    PROJECT_Q_CAMPAIGN_APP_ENABLED: 'true',
    PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'TRUE',
    PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'false',
  });

  assert.equal(status.enabledCount, 1);
  assert.equal(status.totalCount, 3);
  assert.equal(status.ready, false);
  assert.equal(status.systems.find(({ key }) => key === 'app').enabled, true);
  assert.equal(status.systems.find(({ key }) => key === 'wallet').enabled, false);
});

test('launch systems report ready only when all switches are enabled', () => {
  const status = getLaunchSystemStatus({
    PROJECT_Q_CAMPAIGN_APP_ENABLED: 'true',
    PROJECT_Q_WALLET_VERIFICATION_ENABLED: 'true',
    PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED: 'true',
  });

  assert.equal(status.ready, true);
  assert.match(buildLaunchSystemText(status), /Enabled:\* 3\/3/);
  assert.match(buildLaunchSystemText(status), /No switch can be changed from this screen/);
});
