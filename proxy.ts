import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  // Use x-forwarded-host if behind a proxy (Vercel/Cloudflare), otherwise use host header
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const protocol =
    request.headers.get('x-forwarded-proto') || (url.protocol === 'https:' ? 'https' : 'http');

  // Only apply redirects in production
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // 1. Redirect HTTP to HTTPS
    if (protocol === 'http') {
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }

    // 2. Redirect non-www to www (canonical domain)
    // This fixes "Duplicate without user-selected canonical" in Google Search Console
    // Note: If you use Cloudflare, ensure SSL is set to "Full" (not "Flexible") to avoid redirect loops
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isVercelPreview = hostname.includes('vercel.app');

    if (!isLocalhost && !isVercelPreview && hostname === 'thepatternsplace.com') {
      url.hostname = 'www.thepatternsplace.com';
      return NextResponse.redirect(url, 301);
    }
  }

  // Update Supabase session (this handles auth)
  const sessionResponse = await updateSession(request);

  // CRITICAL: Create a new response to ensure headers are properly set
  // updateSession may create new response objects when cookies are set
  const response = NextResponse.next({
    request,
  });

  // Copy cookies from sessionResponse to our new response
  sessionResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      sameSite: cookie.sameSite as any,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expires: cookie.expires,
      maxAge: cookie.maxAge,
    });
  });

  // Apply security headers
  // Content Security Policy - MUST include connect-js.stripe.com for Stripe Connect
  // Updated: 2025-01-14 - Added all required Stripe domains
  // CRITICAL: This CSP must include connect-js.stripe.com for Stripe Connect.js to load
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://connect.stripe.com https://connect-js.stripe.com https://b.stripecdn.com https://hooks.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://connect-js.stripe.com https://connect.stripe.com https://js.stripe.com https://hooks.stripe.com https://b.stripecdn.com https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://connect.stripe.com https://connect-js.stripe.com",
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

  // Debug: Verify CSP is being set (remove after confirming it works)
  if (process.env.NODE_ENV === 'production') {
    console.log('[PROXY] Setting CSP with connect-js.stripe.com');
  }

  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
