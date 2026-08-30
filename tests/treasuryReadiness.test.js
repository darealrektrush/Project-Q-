import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';

import {
  buildTreasuryReadinessText,
  CAMPAIGN_FUNDING_BASE_UNITS,
  decodeSquadsMultisigAccount,
  DIAMOND_DUCK_BASE_UNITS,
  deriveSquadsVaultPda,
  inspectTreasuryReadiness,
  loadTreasuryConfiguration,
  SOLANA_MAINNET_GENESIS_HASH,
  SQUADS_V4_PROGRAM_ID,
} from '../src/campaign/treasuryReadiness.js';
import { FAWKQ_MINT, TOKEN_2022_PROGRAM_ID } from '../src/campaign/walletStatus.js';

const ADDRESSES = [
  '11111111111111111111111111111111',
  'Vote111111111111111111111111111111111111111',
  'Stake11111111111111111111111111111111111111',
  'SysvarRent111111111111111111111111111111111',
];

function env(overrides = {}) {
  return {
    PROJECT_Q_BOND_SQUADS_MULTISIG: ADDRESSES[0],
    PROJECT_Q_BOND_SQUADS_MEMBERS: ADDRESSES.slice(1).join(','),
    PROJECT_Q_BOND_TREASURY_VAULT_INDEX: '0',
    ...overrides,
  };
}

function parsedTokenAccount(owner, amount) {
  return {
    account: {
      data: {
        parsed: {
          info: {
            mint: FAWKQ_MINT,
            owner: owner.toBase58(),
            tokenAmount: { amount: String(amount), decimals: 6 },
          },
        },
      },
    },
  };
}

function fixtureConnection(configuration, overrides = {}) {
  return {
    getGenesisHash: async () => SOLANA_MAINNET_GENESIS_HASH,
    getParsedAccountInfo: async () => ({
      value: {
        owner: new PublicKey(TOKEN_2022_PROGRAM_ID),
        data: { parsed: { info: { decimals: 6 } } },
      },
    }),
    getParsedTokenAccountsByOwner: async (owner) => ({
      value: [parsedTokenAccount(owner, owner.equals(configuration.vault)
        ? CAMPAIGN_FUNDING_BASE_UNITS
        : 0n)],
    }),
    ...overrides,
  };
}

function multisigLoader(configuration, overrides = {}) {
  return async () => ({
    threshold: 2,
    members: configuration.members.map((key) => ({
      key,
      permissionsMask: 7,
    })),
    ...overrides,
  });
}

function encodedMultisig({ threshold = 2, members = ADDRESSES.slice(1), permissionMask = 7 } = {}) {
  const discriminator = Buffer.from([224, 116, 121, 186, 68, 161, 79, 236]);
  const fixedFields = Buffer.alloc(32 + 32 + 2 + 4 + 8 + 8 + 1 + 1 + 4);
  fixedFields.writeUInt16LE(threshold, 64);
  fixedFields.writeUInt8(0, 86); // no rent collector
  fixedFields.writeUInt8(1, 87); // bump
  fixedFields.writeUInt32LE(members.length, 88);
  const memberBytes = members.map((member) => Buffer.concat([
    new PublicKey(member).toBuffer(),
    Buffer.from([permissionMask]),
  ]));
  return Buffer.concat([discriminator, fixedFields, ...memberBytes]);
}

test('treasury configuration derives exactly one Squads treasury vault PDA', () => {
  const configuration = loadTreasuryConfiguration(env());
  assert.equal(configuration.members.length, 3);
  assert.equal(configuration.vault.toBase58(), 'HyvBpUqbXi4DEpVknM8Z6tUK3mKUTHaGmQ321rgvdDU6');
  assert.equal(configuration.vaultIndex, 0);
  assert.match(configuration.memberFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(deriveSquadsVaultPda(configuration.multisig, 0).toBase58(), 'HyvBpUqbXi4DEpVknM8Z6tUK3mKUTHaGmQ321rgvdDU6');
});

test('minimal Squads v4 decoder accepts the locked fields and fails closed on invalid data', () => {
  const decoded = decodeSquadsMultisigAccount(encodedMultisig());
  assert.equal(decoded.threshold, 2);
  assert.deepEqual(decoded.members.map(({ key }) => key.toBase58()), ADDRESSES.slice(1));
  assert.ok(decoded.members.every(({ permissionsMask }) => permissionsMask === 7));
  assert.throws(() => decodeSquadsMultisigAccount(Buffer.alloc(8)), /not a Squads v4 multisig/);
  assert.throws(() => decodeSquadsMultisigAccount(encodedMultisig().subarray(0, -1)), /truncated/);
});

test('default Squads loader verifies program ownership before decoding', async () => {
  const configuration = loadTreasuryConfiguration(env());
  const connection = fixtureConnection(configuration, {
    getAccountInfo: async () => ({
      owner: new PublicKey(SQUADS_V4_PROGRAM_ID),
      data: encodedMultisig(),
    }),
  });
  const readiness = await inspectTreasuryReadiness(connection, { env: env() });
  assert.equal(readiness.ready, true);

  const wrongOwner = fixtureConnection(configuration, {
    getAccountInfo: async () => ({ owner: new PublicKey(ADDRESSES[0]), data: encodedMultisig() }),
  });
  await assert.rejects(() => inspectTreasuryReadiness(wrongOwner, { env: env() }), /not owned by the Squads v4 program/);
});

test('treasury configuration fails closed for missing or invalid values', () => {
  assert.throws(() => loadTreasuryConfiguration(env({ PROJECT_Q_BOND_SQUADS_MEMBERS: '' })), /Missing treasury configuration/);
  assert.throws(() => loadTreasuryConfiguration(env({ PROJECT_Q_BOND_SQUADS_MULTISIG: 'invalid' })), /valid Solana public key/);
  assert.throws(() => loadTreasuryConfiguration(env({ PROJECT_Q_BOND_TREASURY_VAULT_INDEX: '256' })), /supported vault-index range/);
});

test('finalized treasury inspection passes only the exact locked 2-of-3 funding model', async () => {
  const configuration = loadTreasuryConfiguration(env());
  const readiness = await inspectTreasuryReadiness(fixtureConnection(configuration), {
    env: env(),
    now: new Date('2026-08-30T12:00:00.000Z'),
    multisigLoader: multisigLoader(configuration),
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.balances.treasuryBaseUnits, CAMPAIGN_FUNDING_BASE_UNITS.toString());
  assert.equal(readiness.vault, configuration.vault.toBase58());
  assert.equal(readiness.diamondDuckFunded, false);
  assert.match(buildTreasuryReadinessText(readiness), /scheduled after founder Streamflow unlock/);
  assert.doesNotMatch(buildTreasuryReadinessText(readiness), new RegExp(ADDRESSES[1]));
});

test('the same Bond vault recognizes the 2.5M Diamond Duck deposit after Streamflow unlock', async () => {
  const configuration = loadTreasuryConfiguration(env());
  const readiness = await inspectTreasuryReadiness(fixtureConnection(configuration, {
    getParsedTokenAccountsByOwner: async (owner) => ({
      value: [parsedTokenAccount(owner, CAMPAIGN_FUNDING_BASE_UNITS + DIAMOND_DUCK_BASE_UNITS)],
    }),
  }), { env: env(), multisigLoader: multisigLoader(configuration) });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.diamondDuckFunded, true);
  assert.match(buildTreasuryReadinessText(readiness), /Diamond Duck: 2,500,000 FAWKQ funded/);
});

test('wrong network, threshold, member set, or exact treasury funding blocks readiness', async () => {
  const configuration = loadTreasuryConfiguration(env());
  const wrongNetwork = await inspectTreasuryReadiness(fixtureConnection(configuration, {
    getGenesisHash: async () => 'devnet',
  }), { env: env(), multisigLoader: multisigLoader(configuration) });
  assert.equal(wrongNetwork.ready, false);

  const wrongThreshold = await inspectTreasuryReadiness(fixtureConnection(configuration), {
    env: env(), multisigLoader: multisigLoader(configuration, { threshold: 1 }),
  });
  assert.equal(wrongThreshold.ready, false);

  const wrongMembers = await inspectTreasuryReadiness(fixtureConnection(configuration), {
    env: env(), multisigLoader: async () => ({ threshold: 2, members: [] }),
  });
  assert.equal(wrongMembers.ready, false);

  const underfunded = await inspectTreasuryReadiness(fixtureConnection(configuration, {
    getParsedTokenAccountsByOwner: async (owner) => ({
      value: [parsedTokenAccount(owner, CAMPAIGN_FUNDING_BASE_UNITS - 1n)],
    }),
  }), { env: env(), multisigLoader: multisigLoader(configuration) });
  assert.equal(underfunded.ready, false);

  const overfunded = await inspectTreasuryReadiness(fixtureConnection(configuration, {
    getParsedTokenAccountsByOwner: async (owner) => ({
      value: [parsedTokenAccount(owner, CAMPAIGN_FUNDING_BASE_UNITS + 1n)],
    }),
  }), { env: env(), multisigLoader: multisigLoader(configuration) });
  assert.equal(overfunded.ready, false);
});

test('missing configuration returns a closed status without performing RPC reads', async () => {
  let called = false;
  const readiness = await inspectTreasuryReadiness({ getGenesisHash: async () => { called = true; } }, { env: {} });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.available, false);
  assert.equal(called, false);
});
