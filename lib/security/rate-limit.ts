/**
 * Simple in-memory rate limiting
 * For production, consider using Redis or a dedicated service
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Custom identifier (defaults to IP)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limit a request
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export function rateLimit(identifier: string, options: RateLimitOptions): RateLimitResult {
  const { windowMs, maxRequests } = options;
  const now = Date.now();
  const key = `${identifier}:${options.identifier || 'default'}`;

  let entry = store.get(key);

  // If entry doesn't exist or has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    store.set(key, entry);
  }

  // Increment count
  entry.count += 1;

  const remaining = Math.max(0, maxRequests - entry.count);
  const success = entry.count <= maxRequests;

  return {
    success,
    limit: maxRequests,
    remaining,
    reset: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (won't work in serverless, but helps in development)
  return 'unknown';
}

/**
 * Common rate limit presets
 */
export const RATE_LIMITS = {
  // Strict: 10 requests per minute
  STRICT: { windowMs: 60 * 1000, maxRequests: 10 },
  // Standard: 60 requests per minute
  STANDARD: { windowMs: 60 * 1000, maxRequests: 60 },
  // Lenient: 100 requests per minute
  LENIENT: { windowMs: 60 * 1000, maxRequests: 100 },
  // Auth: 5 requests per 15 minutes (for login/registration)
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  // File upload: 10 uploads per hour
  FILE_UPLOAD: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
} as const;
