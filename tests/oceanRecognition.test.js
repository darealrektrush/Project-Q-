import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeOceanContributor, oceanCommunityBoard, proposedOceanXp,
} from '../src/campaign/oceanRecognition.js';

function receipt(index, day, extra = {}) {
  return { signature: `sig-${index}`, asset: 'SOL', verifiedAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`,
    status: 'VERIFIED', ...extra };
}

test('tiers and badges require verified distinct contributions and distinct days', () => {
  const rows = [receipt(1, 1), receipt(1, 1), receipt(2, 1), receipt(3, 2), receipt(4, 3, { campaignEligible: true }),
    receipt(5, 4, { status: 'PENDING' })];
  assert.deepEqual(summarizeOceanContributor(rows, { now: new Date('2026-09-29') }), {
    contributions: 4, days: 3, tier: 'protector', badgeKeys: ['first', 'repeat', 'campaign'], campaignCount: 1,
  });
  assert.equal(summarizeOceanContributor([], { now: new Date('2026-09-29') }).tier, null);
});

test('participation board excludes anonymous, project and founder deposits from named ranking', () => {
  const summary = { contributions: 3, days: 2, tier: 'supporter' };
  const board = oceanCommunityBoard([
    { type: 'COMMUNITY', visibility: 'PUBLIC', publicName: 'Alice', summary },
    { type: 'COMMUNITY', visibility: 'ALIAS', alias: 'Ocean Crab', publicName: 'private real name', summary: { contributions: 2, days: 2 } },
    { type: 'COMMUNITY', visibility: 'ANONYMOUS', publicName: 'Secret', summary },
    { type: 'PROJECT', visibility: 'PUBLIC', publicName: 'Project Q', summary },
    { type: 'FOUNDER', visibility: 'PUBLIC', publicName: 'Founder', summary },
  ]);
  assert.deepEqual(board.map((row) => row.name), ['Alice', 'Ocean Crab']);
  assert.doesNotMatch(JSON.stringify(board), /Secret|private real name|Project Q|Founder/);
});

test('draft campaign XP cannot be awarded without valuation and remains capped', () => {
  assert.deepEqual(proposedOceanXp({ qualifiedByPrice: false }), { amount: 0, reason: 'price_evidence_pending' });
  assert.equal(proposedOceanXp({ qualifiedByPrice: true }).amount, 4);
  assert.equal(proposedOceanXp({ qualifiedByPrice: true, daysBefore: 1 }).amount, 5);
  assert.equal(proposedOceanXp({ qualifiedByPrice: true, daysBefore: 5, awardedThisCampaign: 10 }).amount, 2);
  assert.equal(proposedOceanXp({ qualifiedByPrice: true, awardedThisCampaign: 12 }).amount, 0);
});
