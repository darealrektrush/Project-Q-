import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertBurnProposal,
  formatTokenBaseUnits,
  progressBps,
  supplyRemovedBps,
} from '../src/earnToBurn/economics.js';

const program = {
  state: 'ENABLED', mint: 'mint', tokenProgramId: 'token-2022',
  approvedSourceAccounts: ['reserve'], hardCapBaseUnits: '30000000000000',
  maxSingleBurnBaseUnits: '15000000000000', committedBaseUnits: '0',
};
const milestone = { state: 'UNLOCKED', burnAmountBaseUnits: '15000000000000' };
const proposal = {
  mint: 'mint', tokenProgramId: 'token-2022', sourceTokenAccount: 'reserve',
  amountBaseUnits: '15000000000000',
};

test('FAWKQ base-unit economics remain exact beyond Number-safe arithmetic', () => {
  assert.equal(formatTokenBaseUnits('999999999658335', 6), '999,999,999.658335');
  assert.equal(formatTokenBaseUnits('15000000000000', 6), '15,000,000');
  assert.equal(progressBps(150, 100), 10_000);
  assert.equal(supplyRemovedBps('1000000000000000', '15000000000000'), 150);
});

test('burn proposal validation pins identity, source, amount and caps', () => {
  assert.equal(assertBurnProposal(program, milestone, proposal), true);
  assert.throws(() => assertBurnProposal(program, milestone, { ...proposal, mint: 'wrong' }), /mint/);
  assert.throws(() => assertBurnProposal(program, milestone, { ...proposal, tokenProgramId: 'wrong' }), /token program/);
  assert.throws(() => assertBurnProposal(program, milestone, { ...proposal, sourceTokenAccount: 'wrong' }), /source/);
  assert.throws(() => assertBurnProposal(program, milestone, { ...proposal, amountBaseUnits: '1' }), /milestone/);
  assert.throws(() => assertBurnProposal({ ...program, maxSingleBurnBaseUnits: '1' }, milestone, proposal), /maximum/);
  assert.throws(() => assertBurnProposal({ ...program, committedBaseUnits: '20000000000000' }, milestone, proposal), /hard campaign/);
});
