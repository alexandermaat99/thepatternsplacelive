import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Handle HTTP to HTTPS redirect
  if (request.nextUrl.protocol === 'http:') {
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  // Handle www redirect - redirect non-www to www
  // Only in production to avoid breaking localhost
  if (process.env.NODE_ENV === 'production') {
    const isWww = hostname.startsWith('www.');
    const isThePatternsPlace = hostname.includes('thepatternsplace.com');

    if (isThePatternsPlace && !isWww) {
      url.hostname = `www.${hostname}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // Update Supabase session (this handles auth)
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
