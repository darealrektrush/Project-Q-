import test from 'node:test';
import assert from 'node:assert/strict';
import { rehearseOracleProjectQCanary } from '../src/campaign/integrationCanary.js';

test('rehearses the Oracle to Project Q campaign identity, wallet and XP loop safely', async () => {
  const result = await rehearseOracleProjectQCanary();
  assert.equal(result.mode, 'IN_MEMORY_NO_WRITES_NO_FUNDS');
  assert.equal(result.fundsMoved, false);
  assert.equal(result.featureFlagsChanged, false);
  assert.equal(result.payloadCount, 2);
  assert.equal(result.permanentReceiptCount, 1);
  assert.equal(Object.values(result.checks).every(Boolean), true);
});
