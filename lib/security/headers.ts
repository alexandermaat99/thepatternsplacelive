import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers middleware
 * Protects against common web vulnerabilities
 */
export function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  const isProduction = process.env.NODE_ENV === 'production';

  // Content Security Policy
  // Allow self, Supabase, Stripe, Google Analytics/GTM and Google Ads (conversion scripts), and common CDNs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://js.stripe.com https://connect.stripe.com https://connect-js.stripe.com https://b.stripecdn.com https://hooks.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://js.stripe.com https://hooks.stripe.com https://b.stripecdn.com https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com",
    "frame-src 'self' https://www.googletagmanager.com https://js.stripe.com https://hooks.stripe.com https://connect.stripe.com https://connect-js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Set security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set(
    'Strict-Transport-Security',
    isProduction ? 'max-age=31536000; includeSubDomains; preload' : 'max-age=0'
  );
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', cspDirectives);

  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}
