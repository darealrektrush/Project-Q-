import test from 'node:test';
import assert from 'node:assert/strict';

import { closedEarnToBurnSummary, getBurnReceipt, getEarnToBurnSummary } from '../src/earnToBurn/service.js';

test('missing program returns a closed draft state', async () => {
  const summary = await getEarnToBurnSummary({ select: async () => [] }, 'bond-the-duck-2026');
  assert.deepEqual(summary, closedEarnToBurnSummary('bond-the-duck-2026'));
  assert.equal(summary.burnCount, 0);
  assert.equal(summary.unavailable, true);
});

test('public summary is derived from append-only progress and receipts', async () => {
  const client={select:async table=>({
    earn_to_burn_programs:[{ id:'p1',campaign_id:'bond',state:'ENABLED',mint:'mint',token_program_id:'token',decimals:6,original_supply_base_units:'1000000000000000',observed_start_supply_base_units:'999999999658335',hard_cap_base_units:'30000000000000' }],
    burn_milestones:[{ id:'m1',sequence:1,label:'Opening',state:'LOCKED',progress_target_units:'100',burn_amount_base_units:'15000000000000' }],
    burn_receipts:[], burn_progress_events:[{units:'25'}],
  })[table]};
  const summary=await getEarnToBurnSummary(client,'bond');
  assert.equal(summary.progressUnits,'25');
  assert.equal(summary.nextMilestone.progressBps,2500);
  assert.equal(summary.currentSupplyBaseUnits,'999999999658335');
});

test('append-only correction events cannot make public progress negative', async () => {
  const client={select:async table=>({
    earn_to_burn_programs:[{ id:'p1',campaign_id:'bond',state:'ENABLED',mint:'mint',token_program_id:'token',decimals:6,original_supply_base_units:'1000000000000000',hard_cap_base_units:'1' }],
    burn_milestones:[{ id:'m1',sequence:1,label:'Opening',state:'LOCKED',progress_target_units:'100',burn_amount_base_units:'1' }],
    burn_receipts:[],burn_progress_events:[{units:'10'},{units:'-20'}],
  })[table]};
  const summary=await getEarnToBurnSummary(client,'bond');
  assert.equal(summary.progressUnits,'0');
  assert.equal(summary.nextMilestone.progressBps,0);
});

test('receipt lookup validates public receipt codes', async () => {
  await assert.rejects(() => getBurnReceipt({ select: async()=>[] }, '../bad'), /invalid/);
  assert.equal(await getBurnReceipt({ select: async()=>[] }, 'ETB-0001'), null);
});
