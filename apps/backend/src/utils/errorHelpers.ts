/**
 * Error parsing utilities inspired by antigravity-claude-proxy
 * Categorizes API errors for better user experience
 */

export interface ParsedError {
  errorType: 'api_error' | 'authentication_error' | 'rate_limit_error' | 'invalid_request_error' | 'permission_error' | 'not_found_error';
  statusCode: number;
  errorMessage: string;
  model?: string;
  resetTime?: string;
}

/**
 * Parse error message to extract error type, status code, and user-friendly message
 * Based on antigravity-claude-proxy parseError logic
 */
export function parseError(error: Error | string): ParsedError {
  const message = typeof error === 'string' ? error : error.message;
  
  let errorType: ParsedError['errorType'] = 'api_error';
  let statusCode = 500;
  let errorMessage = message;
  let model: string | undefined;
  let resetTime: string | undefined;

  if (message.includes('401') || message.includes('UNAUTHENTICATED')) {
    errorType = 'authentication_error';
    statusCode = 401;
    errorMessage = 'Authentication failed. Make sure the access token is valid.';
  } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('QUOTA_EXHAUSTED')) {
    errorType = 'rate_limit_error';
    statusCode = 429;

    // Try to extract the quota reset time from the error
    const resetMatch = message.match(/quota will reset after ([\dh\dm\ds]+)/i);
    // Try to extract model from error format
    const modelMatch = message.match(/Rate limited on ([^.]+)\./) || message.match(/"model":\s*"([^"]+)"/);
    model = modelMatch ? modelMatch[1] : undefined;

    if (resetMatch) {
      resetTime = resetMatch[1];
      errorMessage = `Quota exhausted${model ? ` for ${model}` : ''}. Reset after ${resetTime}.`;
    } else {
      errorMessage = `Quota exhausted${model ? ` for ${model}` : ''}. Please wait for reset.`;
    }
  } else if (message.includes('invalid_request_error') || message.includes('INVALID_ARGUMENT')) {
    errorType = 'invalid_request_error';
    statusCode = 400;
    const msgMatch = message.match(/"message":"([^"]+)"/);
    if (msgMatch) errorMessage = msgMatch[1];
  } else if (message.includes('All endpoints failed')) {
    errorType = 'api_error';
    statusCode = 503;
    errorMessage = 'Unable to connect to API. Check network connectivity.';
  } else if (message.includes('PERMISSION_DENIED')) {
    errorType = 'permission_error';
    statusCode = 403;
    errorMessage = 'Permission denied. Check account permissions.';
  } else if (message.includes('404') || message.includes('NOT_FOUND')) {
    errorType = 'not_found_error';
    statusCode = 404;
    errorMessage = 'Resource not found.';
  }

  return { errorType, statusCode, errorMessage, model, resetTime };
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: ParsedError): boolean {
  return error.errorType === 'api_error' && error.statusCode >= 500;
}

/**
 * Check if an error indicates rate limiting
 */
export function isRateLimitError(error: ParsedError): boolean {
  return error.errorType === 'rate_limit_error';
}

/**
 * Check if an error indicates authentication issues
 */
export function isAuthError(error: ParsedError): boolean {
  return error.errorType === 'authentication_error';
}
