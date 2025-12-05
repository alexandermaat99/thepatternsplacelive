/**
 * Request size and timeout limits
 * Prevents DoS attacks from large payloads or long-running requests
 */

export const REQUEST_LIMITS = {
  // Maximum request body size (1MB for most endpoints, 10MB for file uploads)
  MAX_BODY_SIZE: 1 * 1024 * 1024, // 1MB
  MAX_BODY_SIZE_FILE_UPLOAD: 10 * 1024 * 1024, // 10MB

  // Maximum URL length
  MAX_URL_LENGTH: 2048,

  // Maximum number of query parameters
  MAX_QUERY_PARAMS: 50,

  // Request timeout (30 seconds)
  REQUEST_TIMEOUT_MS: 30 * 1000,
} as const;

/**
 * Validate request body size
 */
export function validateRequestBodySize(
  contentLength: string | null,
  maxSize: number = REQUEST_LIMITS.MAX_BODY_SIZE
): { valid: boolean; error?: string } {
  if (!contentLength) {
    return { valid: true }; // No content length header, let it proceed
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return { valid: false, error: 'Invalid Content-Length header' };
  }

  if (size > maxSize) {
    return {
      valid: false,
      error: `Request body too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL length
 */
export function validateUrlLength(url: string): { valid: boolean; error?: string } {
  if (url.length > REQUEST_LIMITS.MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL too long. Maximum length is ${REQUEST_LIMITS.MAX_URL_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Create a timeout promise
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = REQUEST_LIMITS.REQUEST_TIMEOUT_MS
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise(timeoutMs)]);
}
