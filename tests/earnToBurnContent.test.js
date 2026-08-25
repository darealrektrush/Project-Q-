import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBurnPublishingPackage } from '../src/earnToBurn/content.js';

test('publishing package prepares platform drafts with receipt facts but does not publish', () => {
  const drafts = buildBurnPublishingPackage({
    receiptCode: 'ETB-0001', burnType: 'RESERVE_BURN',
    amountBaseUnits: '15000000000000', supplyAfterBaseUnits: '984999999658335',
    signature: 'on-chain-signature',
  }, { publicBaseUrl: 'https://project-q.example', originalSupplyBaseUnits: '1000000000000000' });
  assert.match(drafts.x, /15,000,000 FAWKQ permanently removed/);
  assert.match(drafts.x, /ETB-0001/);
  assert.match(drafts.telegram, /campaign-app\/\?receipt=ETB-0001#burns/);
  assert.equal(drafts.projectQ.status, 'CONFIRMED');
  assert.equal(typeof drafts.publish, 'undefined');
});
