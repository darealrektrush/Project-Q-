import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  AccountLayout, ACCOUNT_SIZE, MintLayout, MINT_SIZE,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  getOceanVaultStatus, NATIVE_USDC_MINT, OCEAN_VAULT, oceanVaultTokenAccounts,
} from '../src/campaign/oceanVaultStatus.js';
import { FAWKQ_MINT } from '../src/campaign/walletStatus.js';

const vault = new PublicKey(OCEAN_VAULT);
const empty = PublicKey.default;
const mainnet = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function mintInfo(program) {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode({
    mintAuthorityOption: 0, mintAuthority: empty, supply: 0n, decimals: 6,
    isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: empty,
  }, data);
  return { owner: program, data, lamports: 1, executable: false };
}

function tokenInfo(program, mint, amount, owner = vault) {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode({
    mint: new PublicKey(mint), owner, amount: BigInt(amount),
    delegateOption: 0, delegate: empty, state: 1,
    isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
    closeAuthorityOption: 0, closeAuthority: empty,
  }, data);
  return { owner: program, data, lamports: 2039280, executable: false };
}

function fixture({ usdc = false } = {}) {
  const value = [
    { owner: SystemProgram.programId, executable: false, data: Buffer.alloc(0), lamports: 248947592 },
    mintInfo(TOKEN_PROGRAM_ID),
    mintInfo(TOKEN_2022_PROGRAM_ID),
    usdc ? tokenInfo(TOKEN_PROGRAM_ID, NATIVE_USDC_MINT, '1234567') : null,
    tokenInfo(TOKEN_2022_PROGRAM_ID, FAWKQ_MINT, '35000000000000'),
  ];
  return {
    value,
    connection: {
      getGenesisHash: async () => mainnet,
      getMultipleAccountsInfoAndContext: async () => ({ context: { slot: 450523697 }, value }),
    },
  };
}

test('vault snapshot accepts only finalized mainnet vault and validated token accounts', async () => {
  const { connection } = fixture();
  const status = await getOceanVaultStatus(connection, new Date('2026-09-29T09:00:00Z'));
  assert.equal(status.vault, OCEAN_VAULT);
  assert.equal(status.network, 'mainnet-beta');
  assert.equal(status.slot, 450523697);
  assert.equal(status.sol.balanceLamports, '248947592');
  assert.equal(status.assets.FAWKQ.tokenAccount, oceanVaultTokenAccounts().FAWKQ);
  assert.equal(status.assets.FAWKQ.balanceBaseUnits, '35000000000000');
  assert.equal(status.assets.USDC.available, false);
  assert.equal(status.assets.USDC.tokenAccount, null);
});

test('USDC is shown only when its correctly owned mint-matched token account exists', async () => {
  const { connection } = fixture({ usdc: true });
  const status = await getOceanVaultStatus(connection);
  assert.equal(status.assets.USDC.available, true);
  assert.equal(status.assets.USDC.tokenAccount, oceanVaultTokenAccounts().USDC);
  assert.equal(status.assets.USDC.balanceBaseUnits, '1234567');
});

test('vault observation fails closed on wrong network, vault owner and mismatched token owner', async () => {
  const wrongNetwork = fixture();
  wrongNetwork.connection.getGenesisHash = async () => 'devnet';
  await assert.rejects(getOceanVaultStatus(wrongNetwork.connection), /mainnet/);

  const wrongVault = fixture();
  wrongVault.value[0].owner = TOKEN_PROGRAM_ID;
  await assert.rejects(getOceanVaultStatus(wrongVault.connection), /recipient checks/);

  const wrongToken = fixture();
  wrongToken.value[4] = tokenInfo(TOKEN_2022_PROGRAM_ID, FAWKQ_MINT, '100', empty);
  await assert.rejects(getOceanVaultStatus(wrongToken.connection), /receiving account/);

  const wrongMint = fixture({ usdc: true });
  wrongMint.value[3] = tokenInfo(TOKEN_PROGRAM_ID, FAWKQ_MINT, '100');
  await assert.rejects(getOceanVaultStatus(wrongMint.connection), /receiving account/);
});
