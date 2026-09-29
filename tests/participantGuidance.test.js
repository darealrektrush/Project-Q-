import test from 'node:test';
import assert from 'node:assert/strict';
import { participantClearance, participantNextStep } from '../public/campaign-app/participant-guidance.js';
import { buildParticipantStatusText } from '../src/campaign/ui.js';

const connected = { telegramVerified: true, xVerified: true, walletVerified: true };
const cleared = { ...connected, tokenAccountReady: true, holderEligible: true };

test('three identity connections do not imply five-item operation clearance', () => {
  const checks = participantClearance(connected);
  assert.equal(checks.length, 5);
  assert.equal(checks.filter(item => item.complete).length, 3);
  const next = participantNextStep({ profile: connected, lifecycle: 'ACTIVE' });
  assert.equal(next.title, 'Complete FAWKQ token account');
  assert.equal(next.screen, 'profile');
  assert.equal(next.profileView, 'wallet');
  assert.equal(participantNextStep({ profile: { ...connected, tokenAccountReady: true }, lifecycle: 'ACTIVE' }).title, 'Complete Minimum $2 FAWKQ');
  assert.equal(participantNextStep({ profile: cleared, lifecycle: 'ACTIVE' }).operationsView, 'missions');
});

test('clearance follows configured operation requirements', () => {
  assert.equal(participantClearance(connected, { walletRequiredForRewards: false, minimumFawkqUsd: 0 }).length, 2);
  assert.equal(participantClearance({}, { minimumFawkqUsd: 5 }).at(-1).label, 'Minimum $5 FAWKQ');
});

test('app and bot derive the same clearance count and next step', () => {
  const status = { xVerified: true, walletVerified: true, tokenAccountReady: true, holderEligible: false, totalXp: 12, rewards: { recorded: false } };
  const next = participantNextStep({ profile: { ...status, telegramVerified: true }, lifecycle: 'ACTIVE' });
  const text = buildParticipantStatusText(status, { lifecycle: 'ACTIVE', standing: 7 });
  assert.match(text, /Clearance:\* 4\/5/);
  assert.ok(text.includes(next.title));
  assert.match(text, /Standing:\* #7/);
  assert.match(text, /Awaiting allocation/);
});

test('unavailable identity and Oracle do not offer unsupported connection actions', () => {
  const sync = participantNextStep({ sessionStatus: 'identity-unavailable' });
  assert.equal(sync.retry, true);
  const oracle = participantNextStep({ profile: { telegramVerified: true }, oracleAvailable: false });
  assert.equal(oracle.title, 'Oracle connection pending');
  assert.equal(oracle.screen, 'profile');
  assert.doesNotMatch(buildParticipantStatusText({ unavailable: true }), /0\/5|Unranked|Awaiting allocation/);
});

test('cleared participants follow lifecycle without opening participation during review or pauses', () => {
  for (const lifecycle of ['REVIEWING', 'PAUSED', 'LAUNCH BLOCKED']) {
    const next = participantNextStep({ profile: cleared, lifecycle });
    assert.equal(next.screen, 'operations');
    assert.equal(next.operationsView, 'overview');
  }
  assert.equal(participantNextStep({ profile: cleared, lifecycle: 'DISTRIBUTING' }).screen, 'rewards');
  assert.equal(participantNextStep({ profile: cleared, lifecycle: 'COMPLETED' }).screen, 'record');
});
