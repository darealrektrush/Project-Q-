import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import bs58 from 'bs58';
import {
  FAWKQ_MINT,
  TOKEN_2022_PROGRAM_ID,
  closedFawkqWalletStatus,
  getFawkqWalletStatus,
} from '../src/campaign/walletStatus.js';

function walletAddress() {
  const { publicKey } = generateKeyPairSync('ed25519');
  return bs58.encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32));
}

function parsedTokenAccount({ owner, mint = FAWKQ_MINT, amount }) {
  return {
    account: { data: { parsed: { info: { owner, mint, tokenAmount: { amount } } } } },
  };
}

test('FAWKQ wallet status sums Token-2022 balances with integer base units only', async () => {
  const wallet = walletAddress();
  const calls = [];
  const connection = {
    getParsedTokenAccountsByOwner: async (...args) => {
      calls.push(args);
      return { value: [
        parsedTokenAccount({ owner: wallet, amount: '1500000' }),
        parsedTokenAccount({ owner: wallet, amount: '2500000' }),
        parsedTokenAccount({ owner: wallet, mint: walletAddress(), amount: '9999999' }),
        parsedTokenAccount({ owner: walletAddress(), amount: '9999999' }),
      ] };
    },
  };
  const status = await getFawkqWalletStatus(connection, wallet, {
    now: new Date('2026-08-27T18:00:00.000Z'),
  });
  assert.equal(status.balanceBaseUnits, '4000000');
  assert.equal(status.tokenAccountCount, 2);
  assert.equal(status.decimals, 6);
  assert.equal(status.network, 'mainnet-beta');
  assert.equal(calls[0][0].toBase58(), wallet);
  assert.equal(calls[0][1].programId.toBase58(), TOKEN_2022_PROGRAM_ID);
  assert.equal(calls[0][2], 'confirmed');
});

test('FAWKQ wallet status rejects invalid wallets and malformed token balances', async () => {
  await assert.rejects(
    () => getFawkqWalletStatus({ getParsedTokenAccountsByOwner: async () => ({ value: [] }) }, 'invalid'),
    /invalid reward wallet/
  );
  const wallet = walletAddress();
  await assert.rejects(
    () => getFawkqWalletStatus({
      getParsedTokenAccountsByOwner: async () => ({ value: [
        parsedTokenAccount({ owner: wallet, amount: '1.5' }),
      ] }),
    }, wallet),
    /invalid token balance/
  );
});

test('closed wallet status never fabricates a balance', () => {
  const status = closedFawkqWalletStatus();
  assert.equal(status.available, false);
  assert.equal(status.balanceBaseUnits, null);
  assert.equal(status.mint, FAWKQ_MINT);
  assert.equal(status.tokenProgramId, TOKEN_2022_PROGRAM_ID);
});
