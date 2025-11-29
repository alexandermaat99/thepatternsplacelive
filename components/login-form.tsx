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

      // Verify the session is established by checking the user
      // This ensures cookies are properly set before redirecting
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError || !user) {
        throw new Error('Failed to verify session after login');
      }

      // Refresh the router to sync server-side state
      router.refresh();

      // Determine redirect destination
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

  const handleBack = () => {
    if (typeof window === 'undefined') {
      router.push('/');
      return;
    }

    // Check multiple sources for redirect URL (in priority order)
    // 1. Query parameter redirect
    // 2. sessionStorage (most reliable, set before navigation)
    // 3. Component state redirectUrl (from referrer)
    // 4. document.referrer as last resort
    let finalRedirectUrl = redirectUrlFromParams;

    // Always check sessionStorage (set when clicking login links)
    if (!finalRedirectUrl) {
      const storedRedirect = sessionStorage.getItem('auth_redirect_url');
      if (
        storedRedirect &&
        !storedRedirect.startsWith('/auth') &&
        !storedRedirect.startsWith('/login') &&
        storedRedirect.startsWith('/')
      ) {
        finalRedirectUrl = storedRedirect;
      }
    }

    // Use component state redirectUrl as fallback
    if (!finalRedirectUrl && redirectUrl) {
      finalRedirectUrl = redirectUrl;
    }

    // Last resort: try to extract from referrer
    if (!finalRedirectUrl) {
      const referrer = document.referrer;
      if (referrer) {
        try {
          const referrerUrlObj = new URL(referrer);
          const currentUrlObj = new URL(window.location.href);
          if (referrerUrlObj.origin === currentUrlObj.origin) {
            const referrerPath = referrerUrlObj.pathname + referrerUrlObj.search;
            if (
              !referrerPath.startsWith('/auth') &&
              !referrerPath.startsWith('/login') &&
              referrerPath !== '/'
            ) {
              finalRedirectUrl = referrerPath;
            }
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    }

    // Navigate to redirect URL if we have one
    if (finalRedirectUrl) {
      // Clear sessionStorage after using it
      sessionStorage.removeItem('auth_redirect_url');
      // Use replace instead of push to avoid adding auth page to history
      // This prevents the auth page from appearing when user clicks back
      router.replace(finalRedirectUrl);
    } else {
      // Fallback to home instead of router.back() to avoid going to wrong page
      router.replace('/');
    }
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
