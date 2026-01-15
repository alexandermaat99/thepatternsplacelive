import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasEnvVars } from '../utils';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Apply security headers to the response
  supabaseResponse.headers.set('X-DNS-Prefetch-Control', 'on');
  supabaseResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // If the env vars are not set, skip middleware check. You can remove this once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies have proper settings for localhost
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Don't set domain in localhost - let browser handle it
              // SameSite: 'lax' helps with localhost cookie issues
              sameSite: options?.sameSite || 'lax',
              // Secure should be false for localhost (http)
              secure: process.env.NODE_ENV === 'production',
              // HttpOnly is set by Supabase automatically
              httpOnly: options?.httpOnly ?? true,
            });
          });
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  // Refresh the session - this is critical for maintaining auth state
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Only redirect if we're certain there's no user AND it's not a public route
  // Don't redirect on auth errors - might be temporary (preserves session)
  // Also don't redirect /protected - let the page component handle auth check
  // This prevents redirect loops when cookies are being set
  if (
    !authError &&
    request.nextUrl.pathname !== '/' &&
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/marketplace') &&
    !request.nextUrl.pathname.startsWith('/cart') &&
    !request.nextUrl.pathname.startsWith('/checkout/success') &&
    !request.nextUrl.pathname.startsWith('/protected') &&
    !request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.nextUrl.pathname.startsWith('/fees')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    // Preserve the original URL so we can redirect back after login
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    // Add the original path as a redirect parameter
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
