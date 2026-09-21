import assert from 'node:assert/strict';
import test from 'node:test';

import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair } from '@solana/web3.js';

import { buildBondLifecycleFixture } from '../src/campaign/automatedRehearsal.js';
import { buildBondOnchainRehearsalPlan } from '../src/campaign/bondOnchainRehearsal.js';

function fixture() {
  const { lifecycle } = buildBondLifecycleFixture();
  const ids = [...new Set(lifecycle.cycles.flatMap(({ selection }) =>
    selection.winners.map(({ telegramUserId }) => telegramUserId)))];
  return {
    mint: Keypair.generate().publicKey.toBase58(),
    squadsVaultAuthority: Keypair.generate().publicKey.toBase58(),
    burnAuthority: Keypair.generate().publicKey.toBase58(),
    topContributorWallet: Keypair.generate().publicKey.toBase58(),
    conservationWallet: Keypair.generate().publicKey.toBase58(),
    recipientWalletByTelegramId: new Map(ids.map((id) => [id, Keypair.generate().publicKey.toBase58()])),
  };
}

test('on-chain plan builds every Bond release and burn with Token-2022', () => {
  const result = buildBondOnchainRehearsalPlan(fixture());
  assert.equal(result.manifest.tokenProgramId, TOKEN_2022_PROGRAM_ID.toBase58());
  assert.equal(result.manifest.transferCount, 175);
  assert.equal(result.manifest.transferTotalBaseUnits, '15000000000000');
  assert.equal(result.manifest.burnCount, 5);
  assert.equal(result.manifest.burnTotalBaseUnits, '15000000000000');
  assert.equal(result.manifest.impactTransferCount, 2);
  assert.equal(result.manifest.impactTotalLamports, '1100000000');
  assert.equal(result.manifest.diamondDuckReservedBaseUnits, '2500000000000');
  assert.equal(result.manifest.mutationsPerformed, false);
  assert.match(result.manifest.manifestFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(result.transferBatches.flat().length, 175);
  assert.ok(result.transferBatches.every((batch) => batch.length <= 6));
  assert.ok(result.transferBatches.flat().every(({ instruction }) =>
    instruction.programId.equals(TOKEN_2022_PROGRAM_ID)));
});

test('on-chain plan fails closed on missing recipient or wrong decimals', () => {
  const input = fixture();
  input.recipientWalletByTelegramId.delete(input.recipientWalletByTelegramId.keys().next().value);
  assert.throws(() => buildBondOnchainRehearsalPlan(input), /recipient wallet/);
  assert.throws(() => buildBondOnchainRehearsalPlan({ ...fixture(), decimals: 9 }), /six decimals/);
});
