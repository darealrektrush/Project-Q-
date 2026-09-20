import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { prepareBondFinalRulesPacket } from '../src/campaign/finalRulesPacket.js';

const draft = JSON.parse(await readFile(
  new URL('../config/bond-the-duck-rules-v1.json', import.meta.url),
  'utf8'
));

test('live v1 prepares exactly v2 FINAL regardless of repo draft label', () => {
  const packet = prepareBondFinalRulesPacket({
    campaign: { state:'DRAFT', ruleset_version:1 },
    reviewedDraft: draft,
    activeOpensAt:'2026-10-01T15:00:00Z',
    xInviteMainPostId:'1234567890123456789',
    now:'2026-09-20T08:00:00Z',
  });
  assert.equal(packet.liveVersion,1);
  assert.equal(packet.finalVersion,2);
  assert.equal(packet.rules.rulesetVersion,2);
  assert.equal(packet.rules.status,'FINAL');
  assert.match(packet.rulesHash,/^[0-9a-f]{64}$/);
  assert.equal(packet.mutationsPerformed,false);
});

test('one launch start derives exact five 48-hour cycles and 48-72h review timing', () => {
  const packet = prepareBondFinalRulesPacket({
    campaign: { state:'DRAFT', ruleset_version:1 },
    reviewedDraft: draft,
    activeOpensAt:'2026-10-01T15:00:00Z',
    xInviteMainPostId:'1234567890123456789',
    now:'2026-09-20T08:00:00Z',
  });
  assert.equal(packet.cycles.length,5);
  assert.deepEqual(packet.cycles.map(({cycleId})=>cycleId),[1,2,3,4,5]);
  assert.equal(packet.rules.schedule.activeClosesAt,'2026-10-11T15:00:00.000Z');
  assert.equal(packet.rules.schedule.reviewOpensAt,'2026-10-12T15:00:00.000Z');
  assert.equal(packet.rules.schedule.review48HourCheckpointAt,'2026-10-14T15:00:00.000Z');
  assert.equal(packet.rules.schedule.reviewClosesAt,'2026-10-15T15:00:00.000Z');
});

test('prepared rules preserve locked economics', () => {
  const packet = prepareBondFinalRulesPacket({
    campaign: { state:'READINESS_BLOCKED', ruleset_version:1 },
    reviewedDraft: draft,
    activeOpensAt:'2026-10-01T15:00:00Z',
    xInviteMainPostId:'1234567890123456789',
    now:'2026-09-20T08:00:00Z',
  });
  assert.equal(packet.rules.buyToEarn.mode,'WEIGHT_ONLY');
  assert.equal(packet.rules.buyToEarn.poolBaseUnits,'0');
  assert.equal(packet.rules.buyToEarn.includedInCampaignRewardsBaseUnits,'15000000000000');
  assert.equal(packet.rules.commitments.topContributorLamports,'1000000000');
  assert.equal(packet.rules.commitments.topContributorConservationLamports,'100000000');
  assert.equal(packet.rules.commitments.totalSolCommitmentLamports,'1100000000');
  assert.equal(packet.rules.commitments.earnToBurnSource,'FAWKQ_CREATOR_WALLET');
  assert.equal(packet.rules.earnToBurn.openingBurnBaseUnits,'15000000000000');
});

test('packet fails closed without future date or pinned X post', () => {
  assert.throws(()=>prepareBondFinalRulesPacket({
    campaign:{state:'DRAFT',ruleset_version:1},
    reviewedDraft:draft,
    activeOpensAt:'2026-09-01T00:00:00Z',
    xInviteMainPostId:'1234567890123456789',
    now:'2026-09-20T08:00:00Z',
  }),/future timestamp/);

  assert.throws(()=>prepareBondFinalRulesPacket({
    campaign:{state:'DRAFT',ruleset_version:1},
    reviewedDraft:draft,
    activeOpensAt:'2026-10-01T15:00:00Z',
    xInviteMainPostId:'',
    now:'2026-09-20T08:00:00Z',
  }),/pinned X campaign post ID/);
});
