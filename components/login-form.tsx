'use client';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the redirect URL from query params, or fallback to referrer
  const redirectUrlFromParams = searchParams.get('redirect');
  // Get action parameter (e.g., "heart" for favorite action)
  const action = searchParams.get('action');

  // Get referrer from browser (for when user navigates from public pages)
  const [referrerUrl, setReferrerUrl] = useState<string | null>(null);

  // Immediately check sessionStorage on mount (before useEffect runs)
  const initialStoredRedirect =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect_url') : null;

  useEffect(() => {
    // Only use referrer if no redirect parameter is set
    if (!redirectUrlFromParams && typeof window !== 'undefined') {
      // First, check sessionStorage for a stored redirect URL (or use initial value)
      const storedRedirect = initialStoredRedirect || sessionStorage.getItem('auth_redirect_url');
      if (storedRedirect) {
        try {
          // Validate it's a valid path (not an auth page)
          if (
            !storedRedirect.startsWith('/auth') &&
            !storedRedirect.startsWith('/login') &&
            storedRedirect.startsWith('/')
          ) {
            setReferrerUrl(storedRedirect);
            // Don't clear it - keep it for handleBack
            // But make sure it's stored
            sessionStorage.setItem('auth_redirect_url', storedRedirect);
            return;
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }

      // Fallback to document referrer
      const referrer = document.referrer;
      if (referrer) {
        try {
          const referrerUrlObj = new URL(referrer);
          const currentUrlObj = new URL(window.location.href);
          // Only use referrer if it's from the same origin
          if (referrerUrlObj.origin === currentUrlObj.origin) {
            const referrerPath = referrerUrlObj.pathname + referrerUrlObj.search;
            // Don't redirect back to login/auth pages
            if (!referrerPath.startsWith('/auth') && !referrerPath.startsWith('/login')) {
              setReferrerUrl(referrerPath);
              // Store it in sessionStorage for persistence
              sessionStorage.setItem('auth_redirect_url', referrerPath);
            }
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    }
  }, [redirectUrlFromParams]);

  // Prefer redirect parameter over referrer
  const redirectUrl = redirectUrlFromParams || referrerUrl;

  // Store redirect URL in sessionStorage for persistence across auth page navigation
  useEffect(() => {
    if (redirectUrl && typeof window !== 'undefined') {
      sessionStorage.setItem('auth_redirect_url', redirectUrl);
    }
  }, [redirectUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data?.session) {
        throw new Error('Login failed - no session created');
      }

      // Session is created, proceed with redirect
      // We skip getUser() verification here to avoid hanging
      // The full page reload (window.location.href) will verify the session properly

      // Determine redirect destination
      // Note: We use window.location.href which does a full page reload,
      // so router.refresh() is not needed and session will be verified on reload
      // Validate redirect URL to prevent open redirect vulnerabilities
      const getRedirectUrl = (): string => {
        if (!redirectUrl) {
          return '/dashboard'; // Default to dashboard
        }

        // Validate redirect URL - must be a relative path starting with /
        // This prevents open redirect attacks (redirecting to external sites)
        const decodedRedirect = decodeURIComponent(redirectUrl);

        // Allow only relative paths (starting with /)
        // Reject absolute URLs, protocol-relative URLs, or URLs with //
        if (
          decodedRedirect.startsWith('/') &&
          !decodedRedirect.startsWith('//') &&
          !decodedRedirect.includes(':') &&
          !decodedRedirect.includes('<') &&
          !decodedRedirect.includes('>')
        ) {
          return decodedRedirect;
        }

        // If invalid, default to dashboard
        return '/dashboard';
      };

      const destination = getRedirectUrl();

      // Set a flag to indicate we just logged in (prevents auth modal from opening immediately)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_logged_in', 'true');
      }

      // Use window.location for a hard redirect to ensure cookies are sent
      // This is more reliable than router.push for authentication flows
      window.location.href = destination;
    } catch (error: unknown) {
      console.error('Login error:', error);
      setError(
        error instanceof Error ? error.message : 'An error occurred during login. Please try again.'
      );
      setIsLoading(false);
    }
  };

  // Check if a path requires authentication
  const isProtectedRoute = (path: string): boolean => {
    const protectedPaths = ['/dashboard', '/marketplace/sell', '/protected', '/checkout'];
    return protectedPaths.some(p => path.startsWith(p));
  };

  const handleBack = () => {
    // Clear sessionStorage to prevent stale redirects
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_redirect_url');
    }

    // Always go to marketplace - simple and reliable
    // This avoids redirect loops when coming from protected routes
    router.replace('/marketplace');
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={handleBack}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src="/logos/back_logo.svg" alt="The Patterns Place" className="h-10 w-auto" />
          </div>
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
            {action === 'heart' ? (
              <CardDescription>
                Yay! You found something you like. Sign in so you can keep track of your favorite
                patterns!
              </CardDescription>
            ) : (
              <CardDescription>Enter your email below to sign in to your account</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link
                href={
                  redirectUrl
                    ? `/auth/sign-up?redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}`
                    : action === 'heart'
                      ? `/auth/sign-up?action=heart&redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`
                      : '/auth/sign-up'
                }
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
