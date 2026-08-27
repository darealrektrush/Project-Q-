import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FAWKQ_CREATOR_TOKEN_ACCOUNT,
  TOKEN_2022_PROGRAM_ID,
  assertFawkqCreatorSourceIdentity,
  deriveAssociatedTokenAccount,
} from '../src/earnToBurn/identity.js';

test('creator burn source derives through Token-2022 rather than the legacy token program', () => {
  assert.equal(TOKEN_2022_PROGRAM_ID, 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  assert.equal(deriveAssociatedTokenAccount(), FAWKQ_CREATOR_TOKEN_ACCOUNT);
  assert.equal(FAWKQ_CREATOR_TOKEN_ACCOUNT, '3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa');
  assert.equal(assertFawkqCreatorSourceIdentity(), true);
});
