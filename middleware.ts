import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Handle www redirect FIRST (before other middleware)
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Only redirect in production
  if (process.env.NODE_ENV === 'production') {
    // Check if it's thepatternsplace.com (without www)
    // Also handle http -> https redirect
    if (hostname === 'thepatternsplace.com' || hostname === 'www.thepatternsplace.com') {
      // Ensure https
      if (url.protocol !== 'https:') {
        const httpsUrl = url.clone();
        httpsUrl.protocol = 'https:';
        return NextResponse.redirect(httpsUrl, 301);
      }
      
      // Redirect non-www to www
      if (hostname === 'thepatternsplace.com') {
        const wwwUrl = url.clone();
        wwwUrl.hostname = 'www.thepatternsplace.com';
        return NextResponse.redirect(wwwUrl, 301); // Permanent redirect
      }
    }
  }

  // Then run the Supabase session update middleware
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

