import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  // Handle www redirect FIRST (before other processing)
  // Note: Vercel handles HTTPS automatically, but we need to handle www redirect
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Only redirect in production to avoid localhost issues
  if (process.env.NODE_ENV === 'production' && hostname === 'thepatternsplace.com') {
    // Redirect non-www to www (301 permanent redirect for SEO)
    const wwwUrl = url.clone();
    wwwUrl.hostname = 'www.thepatternsplace.com';
    // Preserve protocol (Vercel handles HTTPS)
    return NextResponse.redirect(wwwUrl, 301);
  }

  // Update Supabase session (this handles auth)
  const sessionResponse = await updateSession(request);

  // Apply security headers
  const isProduction = process.env.NODE_ENV === 'production';

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://connect.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://connect.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Set security headers on the session response
  sessionResponse.headers.set('X-DNS-Prefetch-Control', 'on');
  sessionResponse.headers.set(
    'Strict-Transport-Security',
    isProduction ? 'max-age=31536000; includeSubDomains; preload' : 'max-age=0'
  );
  sessionResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  sessionResponse.headers.set('X-Content-Type-Options', 'nosniff');
  sessionResponse.headers.set('X-XSS-Protection', '1; mode=block');
  sessionResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  sessionResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  sessionResponse.headers.set('Content-Security-Policy', cspDirectives);

  // Remove server information
  sessionResponse.headers.delete('X-Powered-By');
  sessionResponse.headers.delete('Server');

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


