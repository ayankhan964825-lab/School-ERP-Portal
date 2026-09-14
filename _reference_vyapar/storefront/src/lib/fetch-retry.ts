import { logSystemError } from './error-logger';

export interface RetryOptions extends RequestInit {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
}

/**
 * A drop-in replacement for `fetch` that adds exponential backoff retry logic.
 * Defaults to 3 retries, starting with 500ms delay and doubling each time.
 */
export async function fetchWithRetry(url: string | URL | Request, options: RetryOptions = {}): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    backoffFactor = 2,
    timeoutMs = 15000,
    ...fetchOptions
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      // Implement abort controller for timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal as any
      });
      
      clearTimeout(id);

      // Only retry on 5xx server errors, 429 Too Many Requests, or network failures
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }

      throw new Error(`HTTP Error: ${response.status}`);
      
    } catch (error: any) {
      attempt++;
      
      if (attempt > maxRetries) {
        // Log to our system error table before failing completely
        try {
          await logSystemError(
            'Network Request Failed after retries',
            { url: url.toString(), attempts: attempt, error: error?.message || String(error) },
            'NETWORK_FAILURE'
          );
        } catch (logErr) {
          console.error('[FetchRetry] Failed to log system error:', logErr);
        }
        
        throw error;
      }

      // Wait before retrying (Exponential Backoff)
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor; // Double the delay
    }
  }

  throw new Error('Unreachable code in fetchWithRetry');
}
