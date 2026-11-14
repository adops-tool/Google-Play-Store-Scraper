import { logger } from "./logger";

export interface RetryOptions {
  /** Number of additional attempts after the initial one. */
  retries?: number;
  /** Delay before the first retry; doubles on each subsequent attempt. */
  baseDelayMs?: number;
  /** Decides whether a failure is worth retrying. Defaults to retrying everything. */
  shouldRetry?: (error: unknown) => boolean;
  /** Label used in log lines to correlate retries with the operation. */
  scope?: string;
}

/**
 * Retries an async operation with exponential backoff and a small amount of
 * jitter. Non-retryable failures abort immediately without consuming attempts.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 2, baseDelayMs = 500, shouldRetry = () => true, scope = "retry" } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetry(error)) {
        break;
      }

      const backoff = baseDelayMs * 2 ** attempt;
      const jitter = Math.floor(Math.random() * backoff * 0.25);
      const delay = backoff + jitter;

      logger.warn(scope, `attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
