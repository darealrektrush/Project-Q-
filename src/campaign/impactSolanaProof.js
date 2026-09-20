import bs58 from 'bs58';
import { SystemProgram } from '@solana/web3.js';

function signatureBytes(signature) {
  try {
    return bs58.decode(signature);
  } catch {
    throw new Error('invalid Solana transaction signature');
  }
}

export function verifyParsedNativeSolTransfer({
  transaction,
  signature,
  expectedRecipient,
  expectedLamports,
} = {}) {
  if (signatureBytes(signature).length !== 64) throw new Error('invalid Solana transaction signature');
  if (!transaction || transaction.meta?.err) throw new Error('SOL transfer transaction is missing or failed');
  if (!Number.isInteger(transaction.slot) || transaction.slot <= 0 || !Number.isInteger(transaction.blockTime)) {
    throw new Error('SOL transfer transaction lacks finalized slot or block time');
  }

  const instructions = [
    ...(transaction.transaction?.message?.instructions ?? []),
    ...(transaction.meta?.innerInstructions ?? []).flatMap(({ instructions = [] }) => instructions),
  ];
  const systemTransfers = instructions.filter((instruction) =>
    String(instruction.programId ?? '') === SystemProgram.programId.toBase58()
    && instruction.parsed?.type === 'transfer'
  );

  if (systemTransfers.length !== 1) {
    throw new Error('impact receipt transaction must contain exactly one system SOL transfer');
  }

  const info = systemTransfers[0].parsed?.info ?? {};
  const destination = String(info.destination ?? '');
  const lamports = String(info.lamports ?? '');
  if (destination !== String(expectedRecipient)) throw new Error('SOL transfer recipient does not match');
  if (lamports !== String(expectedLamports)) throw new Error('SOL transfer amount does not match');

  const blockTime = new Date(transaction.blockTime * 1000).toISOString();
  return {
    signature,
    recipient: destination,
    amountLamports: lamports,
    slot: String(transaction.slot),
    blockTime,
    instructionType: 'system-transfer',
    finalized: true,
  };
}

export async function fetchAndVerifyNativeSolTransfer(connection, signature, expected) {
  const statusResult = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const status = statusResult.value[0];
  if (!status || status.err || status.confirmationStatus !== 'finalized') {
    throw new Error('SOL transfer transaction is not finalized');
  }
  const transaction = await connection.getParsedTransaction(signature, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  });
  return verifyParsedNativeSolTransfer({
    transaction,
    signature,
    expectedRecipient: expected.recipient,
    expectedLamports: expected.amountLamports,
  });
}
