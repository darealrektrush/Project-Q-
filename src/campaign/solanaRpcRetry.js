const TRANSIENT_RPC_ERROR = /(?:429|too many requests|rate limit|econnreset|econnrefused|etimedout|eai_again|fetch failed|socket hang up|\b50[0234]\b)/i;

export function isTransientSolanaRpcError(error) {
  return TRANSIENT_RPC_ERROR.test(String(error?.message || error));
}

export async function withSolanaRpcRetry(operation, {
  maxAttempts = 6,
  initialDelayMs = 500,
  maxDelayMs = 8_000,
  sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
} = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientSolanaRpcError(error) || attempt + 1 >= maxAttempts) throw error;
      await sleep(Math.min(maxDelayMs, initialDelayMs * (2 ** attempt)));
    }
  }
  throw lastError;
}
