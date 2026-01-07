/**
 * Smart 429 Retry Helper with Exponential Backoff
 * Ported from antigravity2api-nodejs
 * 
 * Features:
 * - Parses Google RPC error details for precise retry timing
 * - Exponential backoff with jitter
 * - Configurable max retries
 */

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse duration string to milliseconds
 * Supports formats: "295.285334ms", "0.295285334s", plain numbers
 */
function parseDurationToMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value !== 'string') return null;

  const s = value.trim();
  if (!s) return null;

  // e.g. "295.285334ms"
  const msMatch = s.match(/^(\d+(\.\d+)?)\s*ms$/i);
  if (msMatch) return Math.max(0, Math.floor(Number(msMatch[1])));

  // e.g. "0.295285334s"
  const secMatch = s.match(/^(\d+(\.\d+)?)\s*s$/i);
  if (secMatch) return Math.max(0, Math.floor(Number(secMatch[1]) * 1000));

  // Plain number in string: treat as ms
  const num = Number(s);
  if (Number.isFinite(num)) return Math.max(0, Math.floor(num));
  
  return null;
}

/**
 * Try to parse JSON, handling edge cases
 */
function tryParseJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  
  try {
    return JSON.parse(value);
  } catch {
    // Try to salvage JSON from error message
    const first = value.indexOf('{');
    const last = value.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(value.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: unknown;
  };
  status?: number;
  statusCode?: number;
  message?: string;
  isUpstreamApiError?: boolean;
  rawBody?: unknown;
}

/**
 * Extract error body from various error formats
 */
function extractUpstreamErrorBody(error: ErrorWithResponse): Record<string, unknown> | string | null {
  // Custom UpstreamApiError
  if (error?.isUpstreamApiError && error.rawBody) {
    return tryParseJson(error.rawBody) || (typeof error.rawBody === 'string' ? error.rawBody : null);
  }
  // Axios-like error
  if (error?.response?.data) {
    return tryParseJson(error.response.data) || (typeof error.response.data === 'string' ? error.response.data : null);
  }
  // Fallback: try parse message
  return tryParseJson(error?.message);
}

/**
 * Extract retry delay from upstream error
 * Looks for Google RPC RetryInfo/ErrorInfo fields
 */
function getUpstreamRetryDelayMs(error: ErrorWithResponse): number | null {
  const body = extractUpstreamErrorBody(error);
  const root = (body && typeof body === 'object') ? body : null;
  
  // Navigate to error details
  const inner = (root?.error || root) as Record<string, unknown> | null;
  const details = Array.isArray(inner?.details) ? inner.details : [];

  let bestMs: number | null = null;

  for (const d of details) {
    if (!d || typeof d !== 'object') continue;
    const detail = d as Record<string, unknown>;

    // google.rpc.RetryInfo: { retryDelay: "0.295285334s" }
    const retryDelayMs = parseDurationToMs(detail.retryDelay);
    if (retryDelayMs !== null) {
      bestMs = bestMs === null ? retryDelayMs : Math.max(bestMs, retryDelayMs);
    }

    // google.rpc.ErrorInfo metadata
    const meta = detail.metadata as Record<string, unknown> | undefined;
    if (meta && typeof meta === 'object') {
      // quotaResetDelay: "295.285334ms"
      const quotaResetDelayMs = parseDurationToMs(meta.quotaResetDelay);
      if (quotaResetDelayMs !== null) {
        bestMs = bestMs === null ? quotaResetDelayMs : Math.max(bestMs, quotaResetDelayMs);
      }

      // quotaResetTimeStamp: ISO timestamp
      const ts = meta.quotaResetTimeStamp;
      if (typeof ts === 'string') {
        const t = Date.parse(ts);
        if (Number.isFinite(t)) {
          const deltaMs = Math.max(0, t - Date.now());
          bestMs = bestMs === null ? deltaMs : Math.max(bestMs, deltaMs);
        }
      }
    }

    // Check for MODEL_CAPACITY_EXHAUSTED
    const reason = (details.find((dd: unknown) => 
      dd && typeof dd === 'object' && 'reason' in dd
    ) as Record<string, unknown> | undefined)?.reason;
    
    if (reason === 'MODEL_CAPACITY_EXHAUSTED') {
      bestMs = bestMs === null ? 1000 : Math.max(bestMs, 1000);
    }
  }

  return bestMs;
}

/**
 * Compute backoff delay with jitter
 */
function computeBackoffMs(attempt: number, explicitDelayMs: number | null): number {
  const maxMs = 20_000;
  const hasExplicit = Number.isFinite(explicitDelayMs) && explicitDelayMs !== null;
  const baseMs = hasExplicit ? Math.max(0, Math.floor(explicitDelayMs!)) : 500;
  const exp = Math.min(maxMs, Math.floor(baseMs * Math.pow(2, Math.max(0, attempt - 1))));

  // Add jitter (+-20%)
  const jitterFactor = 0.8 + Math.random() * 0.4;
  const expJittered = Math.max(0, Math.floor(exp * jitterFactor));

  if (hasExplicit) {
    // Add safety buffer
    const buffered = Math.max(0, Math.floor(explicitDelayMs! + 50));
    return Math.min(maxMs, Math.max(expJittered, buffered));
  }

  return Math.min(maxMs, Math.max(500, expJittered));
}

export interface RetryOptions {
  maxRetries?: number;
  logPrefix?: string;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Execute a function with 429 retry logic
 * @param fn - Async function to execute (receives attempt number)
 * @param options - Retry options
 * @returns Result of the function
 */
export async function with429Retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, logPrefix = '' } = options;
  const retries = Number.isFinite(maxRetries) && maxRetries > 0 ? Math.floor(maxRetries) : 0;
  let attempt = 0;

  while (true) {
    try {
      return await fn(attempt);
    } catch (error) {
      const err = error as ErrorWithResponse;
      const status = Number(err.status || err.statusCode || err.response?.status);
      
      // Custom shouldRetry check
      if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
        throw error;
      }

      if (status === 429 && attempt < retries) {
        const nextAttempt = attempt + 1;
        const explicitDelayMs = getUpstreamRetryDelayMs(err);
        const waitMs = computeBackoffMs(nextAttempt, explicitDelayMs);
        
        console.log(
          `${logPrefix}429 received, waiting ${waitMs}ms before retry ${nextAttempt}/${retries}` +
          (explicitDelayMs !== null ? ` (upstream hint: ~${explicitDelayMs}ms)` : '')
        );
        
        await sleep(waitMs);
        attempt = nextAttempt;
        continue;
      }
      
      throw error;
    }
  }
}

/**
 * Create a retry wrapper for a specific function
 */
export function createRetryWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  options: RetryOptions = {}
): (fn: T) => T {
  return (fn: T) => {
    return (async (...args: Parameters<T>) => {
      return with429Retry(() => fn(...args) as Promise<ReturnType<T>>, options);
    }) as T;
  };
}

export { parseDurationToMs, getUpstreamRetryDelayMs, computeBackoffMs };
