import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';

import { TOKEN_2022_PROGRAM_ID, verifyParsedBurnTransaction } from '../src/earnToBurn/solanaProof.js';

const signature = bs58.encode(new Uint8Array(64).fill(1));
const expected = {
  mint: 'FAWKQmint', tokenProgramId: TOKEN_2022_PROGRAM_ID,
  sourceTokenAccount: 'approvedReserve', amountBaseUnits: '15000000000000',
  supplyBeforeBaseUnits: '999999999658335',
};

function transaction(overrides={}) {
  const instruction = {
    programId: TOKEN_2022_PROGRAM_ID,
    parsed: { type: 'burnChecked', info: {
      account: 'approvedReserve', mint: 'FAWKQmint', tokenAmount: { amount: '15000000000000' },
    } },
  };
  return {
    slot: 123, blockTime: 1_700_000_000,
    transaction: { message: { accountKeys: ['approvedReserve'], instructions: [instruction] } },
    meta: {
      err: null,
      preTokenBalances: [{ accountIndex: 0, uiTokenAmount: { amount: '20000000000000' } }],
      postTokenBalances: [{ accountIndex: 0, uiTokenAmount: { amount: '5000000000000' } }],
    },
    ...overrides,
  };
}

test('verified Token-2022 proof reconciles exact instruction, account and supply deltas', () => {
  const proof = verifyParsedBurnTransaction({
    transaction: transaction(), signature, expected,
    observedSupplyAfterBaseUnits: '984999999658335',
  });
  assert.equal(proof.amountBaseUnits, '15000000000000');
  assert.equal(proof.supplyBeforeBaseUnits, '999999999658335');
  assert.equal(proof.supplyAfterBaseUnits, '984999999658335');
});

test('verification rejects wrong identity, failed/multiple burns and reconciliation mismatch', () => {
  assert.throws(() => verifyParsedBurnTransaction({ transaction: transaction(), signature, expected: { ...expected, mint: 'wrong' }, observedSupplyAfterBaseUnits: '984999999658335' }), /mint/);
  assert.throws(() => verifyParsedBurnTransaction({ transaction: transaction(), signature, expected: { ...expected, sourceTokenAccount: 'wrong' }, observedSupplyAfterBaseUnits: '984999999658335' }), /source/);
  assert.throws(() => verifyParsedBurnTransaction({ transaction: transaction({ meta: { err: { code: 1 } } }), signature, expected, observedSupplyAfterBaseUnits: '984999999658335' }), /failed/);
  const multiple=transaction(); multiple.transaction.message.instructions.push(multiple.transaction.message.instructions[0]);
  assert.throws(() => verifyParsedBurnTransaction({ transaction: multiple, signature, expected, observedSupplyAfterBaseUnits: '984999999658335' }), /exactly one/);
  assert.throws(() => verifyParsedBurnTransaction({ transaction: transaction(), signature, expected, observedSupplyAfterBaseUnits: '984999999658334' }), /reconcile/);
  assert.throws(() => verifyParsedBurnTransaction({ transaction: transaction(), signature: 'bad', expected, observedSupplyAfterBaseUnits: '984999999658335' }), /signature/);
});

test('verification recognizes a burn invoked as a Squads inner instruction', () => {
  const nested=transaction();
  const [burn]=nested.transaction.message.instructions;
  nested.transaction.message.instructions=[{programId:'SquadsProgram',accounts:[]}];
  nested.meta.innerInstructions=[{index:0,instructions:[burn]}];
  const proof=verifyParsedBurnTransaction({ transaction:nested,signature,expected,observedSupplyAfterBaseUnits:'984999999658335' });
  assert.equal(proof.amountBaseUnits,'15000000000000');
});
