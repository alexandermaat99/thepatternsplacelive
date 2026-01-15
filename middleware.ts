import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
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

  // CRITICAL: Create a new response to ensure headers are properly set
  // updateSession may create new response objects when cookies are set
  const response = NextResponse.next({
    request,
  });

  // Copy cookies from sessionResponse to our new response
  sessionResponse.cookies.getAll().forEach((cookie) => {
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
  const isProduction = process.env.NODE_ENV === 'production';

  // Content Security Policy - MUST include connect-js.stripe.com for Stripe Connect
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

  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
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
