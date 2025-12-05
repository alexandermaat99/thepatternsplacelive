/**
 * URL validation utilities to prevent SSRF attacks
 */

/**
 * Validates that a URL is safe to fetch from (prevents SSRF)
 * @param url - The URL to validate
 * @param allowedHosts - Optional array of allowed hostnames (e.g., ['supabase.co'])
 * @returns Object with isValid flag and error message if invalid
 */
export function validateSafeUrl(
  url: string,
  allowedHosts?: string[]
): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required and must be a string' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS protocols are allowed',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost and local IP addresses
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', '0:0:0:0:0:0:0:1'];

  if (blockedHosts.includes(hostname)) {
    return { isValid: false, error: 'Localhost and local IP addresses are not allowed' };
  }

  // Block private IP ranges
  const privateIpPatterns = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^127\./, // 127.0.0.0/8 (loopback)
    /^::ffff:(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/, // IPv4-mapped IPv6 private
    /^fc00:/, // fc00::/7 (unique local)
    /^fe80:/, // fe80::/10 (link-local)
  ];

  if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
    return { isValid: false, error: 'Private IP addresses are not allowed' };
  }

  // If allowed hosts are specified, check against the whitelist
  if (allowedHosts && allowedHosts.length > 0) {
    const normalizedAllowedHosts = allowedHosts.map(h => h.toLowerCase());
    const isAllowed = normalizedAllowedHosts.some(allowedHost => {
      // Exact match
      if (hostname === allowedHost.toLowerCase()) {
        return true;
      }
      // Subdomain match (e.g., *.supabase.co matches gwvoordtliaptzoffgew.supabase.co)
      if (allowedHost.startsWith('*.')) {
        const baseDomain = allowedHost.slice(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return false;
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: `URL hostname must be one of: ${allowedHosts.join(', ')}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates and fetches from a URL with SSRF protection
 * @param url - The URL to fetch from
 * @param allowedHosts - Optional array of allowed hostnames
 * @returns The fetch Response if valid, throws error if invalid
 */
export async function safeFetch(
  url: string,
  allowedHosts?: string[],
  fetchOptions?: RequestInit
): Promise<Response> {
  const validation = validateSafeUrl(url, allowedHosts);
  if (!validation.isValid) {
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  return fetch(url, fetchOptions);
}
