import bs58 from 'bs58';

import { asBaseUnits } from './economics.js';

export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const LEGACY_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const SUPPORTED_TOKEN_PROGRAM_IDS = new Set([TOKEN_2022_PROGRAM_ID, LEGACY_TOKEN_PROGRAM_ID]);

function signatureBytes(signature) {
  try {
    return bs58.decode(signature);
  } catch {
    throw new Error('invalid Solana transaction signature');
  }
}

function accountKey(value) {
  return String(value?.pubkey ?? value);
}

function instructionAmount(info) {
  return asBaseUnits(info?.tokenAmount?.amount ?? info?.amount, 'instruction burn amount', { allowZero: false });
}

function tokenBalanceForAccount(transaction, balances, tokenAccount) {
  const keys = transaction.transaction.message.accountKeys.map(accountKey);
  const index = keys.indexOf(tokenAccount);
  if (index < 0) throw new Error('approved burn source account is not present in transaction');
  const row = balances.find((balance) => balance.accountIndex === index);
  return row ? asBaseUnits(row.uiTokenAmount?.amount ?? 0) : 0n;
}

export function verifyParsedBurnTransaction({ transaction, signature, expected, observedSupplyAfterBaseUnits }) {
  if (signatureBytes(signature).length !== 64) throw new Error('invalid Solana transaction signature');
  if (!transaction || transaction.meta?.err) throw new Error('burn transaction is missing or failed');
  if (!Number.isInteger(transaction.slot) || transaction.slot <= 0 || !Number.isInteger(transaction.blockTime)) {
    throw new Error('burn transaction lacks confirmed slot or block time');
  }
  if (!SUPPORTED_TOKEN_PROGRAM_IDS.has(expected.tokenProgramId)) throw new Error('unsupported token program');

  const instructions = [
    ...(transaction.transaction?.message?.instructions ?? []),
    ...(transaction.meta?.innerInstructions ?? []).flatMap(({ instructions: inner = [] }) => inner),
  ];
  const candidates = instructions.filter((instruction) => {
    const programId = String(instruction.programId ?? '');
    const type = instruction.parsed?.type;
    return programId === expected.tokenProgramId && (type === 'burn' || type === 'burnChecked');
  });
  if (candidates.length !== 1) throw new Error('transaction must contain exactly one matching burn instruction');

  const info = candidates[0].parsed.info;
  const amount = instructionAmount(info);
  const expectedAmount = asBaseUnits(expected.amountBaseUnits, 'expected burn amount', { allowZero: false });
  if (info.mint !== expected.mint) throw new Error('burn instruction mint does not match proposal');
  if (info.account !== expected.sourceTokenAccount) throw new Error('burn instruction source account does not match proposal');
  if (amount !== expectedAmount) throw new Error('burn instruction amount does not match proposal');

  const preBalance = tokenBalanceForAccount(transaction, transaction.meta.preTokenBalances ?? [], expected.sourceTokenAccount);
  const postBalance = tokenBalanceForAccount(transaction, transaction.meta.postTokenBalances ?? [], expected.sourceTokenAccount);
  if (preBalance - postBalance !== expectedAmount) {
    throw new Error('source token-account balance delta does not equal burn amount');
  }

  const supplyAfter = asBaseUnits(observedSupplyAfterBaseUnits, 'observed supply after burn');
  const supplyBefore = supplyAfter + expectedAmount;
  if (expected.supplyBeforeBaseUnits != null
      && supplyBefore !== asBaseUnits(expected.supplyBeforeBaseUnits, 'expected supply before burn')) {
    throw new Error('observed supply does not reconcile with expected pre-burn supply');
  }

  return {
    signature,
    mint: expected.mint,
    tokenProgramId: expected.tokenProgramId,
    sourceTokenAccount: expected.sourceTokenAccount,
    amountBaseUnits: expectedAmount.toString(),
    supplyBeforeBaseUnits: supplyBefore.toString(),
    supplyAfterBaseUnits: supplyAfter.toString(),
    slot: String(transaction.slot),
    blockTime: new Date(transaction.blockTime * 1000).toISOString(),
    proof: {
      instructionType: candidates[0].parsed.type,
      sourcePreBalanceBaseUnits: preBalance.toString(),
      sourcePostBalanceBaseUnits: postBalance.toString(),
    },
  };
}

export async function fetchAndVerifyBurnTransaction(connection, signature, expected) {
  const statusResult = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const status = statusResult.value[0];
  if (!status || status.err || status.confirmationStatus !== 'finalized') {
    throw new Error('burn transaction is not finalized');
  }
  const transaction = await connection.getParsedTransaction(signature, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  });
  const supply = await connection.getTokenSupply(expected.mintPublicKey, 'finalized');
  return verifyParsedBurnTransaction({
    transaction,
    signature,
    expected,
    observedSupplyAfterBaseUnits: supply.value.amount,
  });
}
