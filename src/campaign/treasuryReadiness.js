import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

import {
  FAWKQ_DECIMALS,
  FAWKQ_MINT,
  TOKEN_2022_PROGRAM_ID,
} from './walletStatus.js';

export const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
export const CAMPAIGN_FUNDING_BASE_UNITS = 15_000_000_000_000n;
export const DIAMOND_DUCK_BASE_UNITS = 2_500_000_000_000n;
export const FULL_BOND_TREASURY_BASE_UNITS = CAMPAIGN_FUNDING_BASE_UNITS + DIAMOND_DUCK_BASE_UNITS;
export const SQUADS_V4_PROGRAM_ID = 'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf';

const SQUADS_MULTISIG_DISCRIMINATOR = Buffer.from([224, 116, 121, 186, 68, 161, 79, 236]);
const SQUADS_VOTE_PERMISSION = 2;
const SQUADS_PROGRAM_KEY = new PublicKey(SQUADS_V4_PROGRAM_ID);

export const TREASURY_ENV_NAMES = Object.freeze([
  'PROJECT_Q_BOND_SQUADS_MULTISIG',
  'PROJECT_Q_BOND_SQUADS_MEMBERS',
  'PROJECT_Q_BOND_TREASURY_VAULT_INDEX',
]);

const INTEGER = /^(0|[1-9]\d*)$/;

function publicKey(value, label) {
  try {
    return new PublicKey(String(value ?? '').trim());
  } catch {
    throw new Error(`${label} is not a valid Solana public key`);
  }
}

function vaultIndex(value, label) {
  const normalized = String(value ?? '').trim();
  if (!INTEGER.test(normalized)) throw new Error(`${label} must be a non-negative integer`);
  const index = Number(normalized);
  if (!Number.isSafeInteger(index) || index > 255) {
    throw new Error(`${label} is outside the supported vault-index range`);
  }
  return index;
}

export function deriveSquadsVaultPda(multisig, index) {
  if (!Number.isInteger(index) || index < 0 || index > 255) {
    throw new Error('Squads vault index must be an integer between 0 and 255');
  }
  return PublicKey.findProgramAddressSync([
    Buffer.from('multisig'),
    multisig.toBuffer(),
    Buffer.from('vault'),
    Buffer.from([index]),
  ], SQUADS_PROGRAM_KEY)[0];
}

export function loadTreasuryConfiguration(env = process.env) {
  const missing = TREASURY_ENV_NAMES.filter((name) => !String(env[name] ?? '').trim());
  if (missing.length) throw new Error(`Missing treasury configuration: ${missing.join(', ')}`);

  const multisig = publicKey(env.PROJECT_Q_BOND_SQUADS_MULTISIG, 'Squads multisig');
  const memberValues = String(env.PROJECT_Q_BOND_SQUADS_MEMBERS)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (memberValues.length !== 3) throw new Error('Squads treasury requires exactly three configured members');
  const members = memberValues.map((value) => publicKey(value, 'Squads member'));
  if (new Set(members.map((member) => member.toBase58())).size !== 3) {
    throw new Error('Squads treasury members must be unique');
  }

  const vaultIndexValue = vaultIndex(env.PROJECT_Q_BOND_TREASURY_VAULT_INDEX, 'Bond treasury vault index');
  const vault = deriveSquadsVaultPda(multisig, vaultIndexValue);
  const memberFingerprint = createHash('sha256')
    .update(members.map((member) => member.toBase58()).sort().join(','))
    .digest('hex');

  return { multisig, members, vaultIndex: vaultIndexValue, vault, memberFingerprint };
}

async function getFawkqBalanceForOwner(connection, owner) {
  const response = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) },
    'finalized'
  );
  let balance = 0n;
  let tokenAccountCount = 0;
  for (const account of response?.value ?? []) {
    const info = account?.account?.data?.parsed?.info;
    if (!info || info.mint !== FAWKQ_MINT || info.owner !== owner.toBase58()) continue;
    if (Number(info.tokenAmount?.decimals) !== FAWKQ_DECIMALS) {
      throw new Error('FAWKQ token account decimals do not match the locked mint configuration');
    }
    const amount = String(info.tokenAmount?.amount ?? '');
    if (!/^\d+$/.test(amount)) throw new Error('FAWKQ token account returned an invalid base-unit balance');
    balance += BigInt(amount);
    tokenAccountCount += 1;
  }
  return { balance, tokenAccountCount };
}

function assertReadable(data, offset, length, label) {
  if (!Buffer.isBuffer(data) || offset < 0 || length < 0 || offset + length > data.length) {
    throw new Error(`Squads multisig account is truncated at ${label}`);
  }
}

export function decodeSquadsMultisigAccount(data) {
  assertReadable(data, 0, 8, 'discriminator');
  if (!data.subarray(0, 8).equals(SQUADS_MULTISIG_DISCRIMINATOR)) {
    throw new Error('Account is not a Squads v4 multisig');
  }

  let offset = 8 + 32 + 32;
  assertReadable(data, offset, 2 + 4 + 8 + 8 + 1, 'fixed fields');
  const threshold = data.readUInt16LE(offset);
  offset += 2 + 4 + 8 + 8;

  const rentCollectorOption = data.readUInt8(offset);
  offset += 1;
  if (rentCollectorOption !== 0 && rentCollectorOption !== 1) {
    throw new Error('Squads multisig has an invalid rent collector option');
  }
  if (rentCollectorOption === 1) {
    assertReadable(data, offset, 32, 'rent collector');
    offset += 32;
  }

  assertReadable(data, offset, 1 + 4, 'member header');
  offset += 1; // bump
  const memberCount = data.readUInt32LE(offset);
  offset += 4;
  if (memberCount > 65_535) throw new Error('Squads multisig member count is unreasonable');
  assertReadable(data, offset, memberCount * 33, 'members');

  const members = [];
  for (let index = 0; index < memberCount; index += 1) {
    const key = new PublicKey(data.subarray(offset, offset + 32));
    const permissionsMask = data.readUInt8(offset + 32);
    members.push({ key, permissionsMask });
    offset += 33;
  }
  return { threshold, members };
}

async function loadSquadsMultisig(connection, multisig) {
  const accountInfo = await connection.getAccountInfo(multisig, 'finalized');
  if (!accountInfo) throw new Error('Unable to find the configured Squads multisig account');
  if (!accountInfo.owner?.equals?.(SQUADS_PROGRAM_KEY)) {
    throw new Error('Configured multisig account is not owned by the Squads v4 program');
  }
  return decodeSquadsMultisigAccount(accountInfo.data);
}

function check(key, label, ready, detail) {
  return { key, label, ready: Boolean(ready), detail: String(detail) };
}

export function closedTreasuryReadiness(reason = 'Treasury readiness is unavailable.') {
  return {
    available: false,
    ready: false,
    network: 'mainnet-beta',
    observedAt: null,
    memberFingerprint: null,
    vault: null,
    balances: null,
    diamondDuckFunded: false,
    checks: [check('configuration', 'Public treasury configuration complete', false, reason)],
  };
}

export async function inspectTreasuryReadiness(connection, {
  env = process.env,
  now = new Date(),
  multisigLoader = loadSquadsMultisig,
} = {}) {
  let configuration;
  try {
    configuration = loadTreasuryConfiguration(env);
  } catch (error) {
    return closedTreasuryReadiness(error.message);
  }

  const checks = [];
  const genesisHash = await connection.getGenesisHash();
  checks.push(check(
    'network',
    'RPC is Solana mainnet-beta',
    genesisHash === SOLANA_MAINNET_GENESIS_HASH,
    genesisHash === SOLANA_MAINNET_GENESIS_HASH ? 'Mainnet genesis confirmed' : 'Wrong Solana network'
  ));

  const multisig = await multisigLoader(connection, configuration.multisig);
  const chainMembers = Array.isArray(multisig?.members) ? multisig.members : [];
  const votingMembers = chainMembers.filter(({ permissionsMask }) =>
    (permissionsMask & SQUADS_VOTE_PERMISSION) === SQUADS_VOTE_PERMISSION
  );
  const expectedMembers = configuration.members.map((member) => member.toBase58()).sort();
  const actualMembers = chainMembers.map(({ key }) => key.toBase58()).sort();
  checks.push(check('threshold', 'Squads approval threshold is exactly 2', multisig?.threshold === 2, `Observed threshold: ${Number(multisig?.threshold ?? 0)}`));
  checks.push(check('members', 'Exactly three configured voting members control the treasury',
    chainMembers.length === 3
      && votingMembers.length === 3
      && JSON.stringify(actualMembers) === JSON.stringify(expectedMembers),
    `${votingMembers.length} voting members observed`
  ));

  const mintInfo = await connection.getParsedAccountInfo(new PublicKey(FAWKQ_MINT), 'finalized');
  const mintOwner = mintInfo?.value?.owner?.toBase58?.();
  const mintDecimals = Number(mintInfo?.value?.data?.parsed?.info?.decimals);
  checks.push(check('mint', 'FAWKQ mint is Token-2022 with six decimals',
    mintOwner === TOKEN_2022_PROGRAM_ID && mintDecimals === FAWKQ_DECIMALS,
    mintOwner === TOKEN_2022_PROGRAM_ID && mintDecimals === FAWKQ_DECIMALS
      ? 'Mint program and decimals confirmed'
      : 'Mint program or decimals mismatch'
  ));

  const treasury = await getFawkqBalanceForOwner(connection, configuration.vault);
  const recognizedTreasuryBalance = treasury.balance === CAMPAIGN_FUNDING_BASE_UNITS
    || treasury.balance === FULL_BOND_TREASURY_BASE_UNITS;
  checks.push(check('treasury-funding', 'Bond treasury holds a recognized campaign funding total',
    recognizedTreasuryBalance,
    `${treasury.balance.toString()} base units observed`
  ));

  return {
    available: true,
    ready: checks.every(({ ready }) => ready),
    network: 'mainnet-beta',
    observedAt: now.toISOString(),
    memberFingerprint: configuration.memberFingerprint,
    vault: configuration.vault.toBase58(),
    balances: {
      treasuryBaseUnits: treasury.balance.toString(),
    },
    diamondDuckFunded: treasury.balance === FULL_BOND_TREASURY_BASE_UNITS,
    checks,
  };
}

export function buildTreasuryReadinessText(readiness) {
  const lines = [
    '🧾 *BOND THE DUCK // TREASURY READINESS*',
    '',
    readiness.ready ? '✅ *READ-ONLY TREASURY EVIDENCE PASSED*' : '⛔ *TREASURY READINESS BLOCKED*',
    '',
  ];
  for (const item of readiness.checks ?? []) {
    lines.push(`${item.ready ? '✅' : '🔴'} ${item.label}`);
  }
  if (readiness.memberFingerprint) {
    lines.push('', `Member-set fingerprint: \`${readiness.memberFingerprint.slice(0, 16)}…\``);
  }
  if (readiness.available) {
    lines.push(readiness.diamondDuckFunded
      ? '💎 Diamond Duck: 2,500,000 FAWKQ funded'
      : '⏳ Diamond Duck: scheduled after founder Streamflow unlock');
  }
  lines.push(
    '',
    '_Finalized mainnet reads only. No proposal, signature, transfer, database write or campaign-state change is performed._'
  );
  return lines.join('\n');
}
