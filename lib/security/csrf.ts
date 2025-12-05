import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

/**
 * CSRF token utilities
 * Generates and validates CSRF tokens for state-changing operations
 */

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get or create CSRF token for current session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;

  if (!token) {
    token = generateCSRFToken();
    cookieStore.set(CSRF_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  return token;
}

/**
 * Validate CSRF token from request
 * @param request - Next.js request object
 * @returns true if token is valid, false otherwise
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;

  if (!cookieToken) {
    return false;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  if (!headerToken) {
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to require CSRF token for POST/PUT/DELETE/PATCH requests
 * Use this in API routes that modify state
 */
export async function requireCSRFToken(request: Request): Promise<{
  valid: boolean;
  error?: string;
}> {
  const method = request.method.toUpperCase();

  // Only require CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return { valid: true };
  }

  // Skip CSRF check for webhooks (they use signature verification instead)
  const url = new URL(request.url);
  if (url.pathname.includes('/webhooks/')) {
    return { valid: true };
  }

  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token',
    };
  }

  return { valid: true };
}
