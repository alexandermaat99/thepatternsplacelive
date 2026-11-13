// A base URL that can never be a real destination. Resolving the candidate
// against it lets the URL parser (not hand-written string checks) decide
// whether it stays on our site.
const PLACEHOLDER_ORIGIN = 'https://same-origin.invalid';

/**
 * Turn an untrusted redirect target (a `?redirect=` / `?next=` param, a stored
 * value) into a same-site path, or return `fallback`.
 *
 * Rejects anything the browser would resolve to another origin, including
 * tricks string checks miss: `//evil.com`, `/\evil.com`, `/%5Cevil.com`,
 * `/\t/evil.com`, `https://evil.com`, `javascript:...`.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  try {
    const url = new URL(candidate, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
