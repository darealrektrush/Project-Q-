import { PublicKey } from '@solana/web3.js';

export const FAWKQ_MINT = 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
export const FAWKQ_DECIMALS = 6;
export const FAWKQ_CREATOR_WALLET = '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT';
export const FAWKQ_CREATOR_TOKEN_ACCOUNT = '3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa';

export function deriveAssociatedTokenAccount({
  owner = FAWKQ_CREATOR_WALLET,
  mint = FAWKQ_MINT,
  tokenProgramId = TOKEN_2022_PROGRAM_ID,
} = {}) {
  const [address] = PublicKey.findProgramAddressSync([
    new PublicKey(owner).toBuffer(),
    new PublicKey(tokenProgramId).toBuffer(),
    new PublicKey(mint).toBuffer(),
  ], new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID));
  return address.toBase58();
}

export function assertFawkqCreatorSourceIdentity() {
  if (deriveAssociatedTokenAccount() !== FAWKQ_CREATOR_TOKEN_ACCOUNT) {
    throw new Error('configured FAWKQ creator token account does not match its Token-2022 derivation');
  }
  return true;
}
