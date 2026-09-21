export async function confirmSolanaSignature(connection, signature, {
  maxAttempts = 60,
  pollIntervalMs = 1_000,
} = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const status = response.value[0];
      if (status?.err) throw new Error(`transaction failed: ${JSON.stringify(status.err)}`);
      if (status && ['confirmed', 'finalized'].includes(status.confirmationStatus)) return signature;
    } catch (error) {
      if (/transaction failed:/.test(error.message)) throw error;
      lastError = error;
    }
    if (attempt + 1 < maxAttempts) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `transaction confirmation remained ambiguous for ${signature}; refusing automatic replay`
    + (lastError ? ` (${lastError.message})` : ''),
  );
}
