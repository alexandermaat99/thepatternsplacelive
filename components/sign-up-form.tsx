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

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get action parameter (e.g., "heart" for favorite action)
  const action = searchParams.get('action');
  // Get redirect URL from query params
  const redirectUrlFromParams = searchParams.get('redirect');

  // Get referrer from browser (for when user navigates from public pages)
  const [referrerUrl, setReferrerUrl] = useState<string | null>(null);

  useEffect(() => {
    // Store current path in sessionStorage when coming from a non-auth page
    // This helps us remember where to go back even if referrer is lost
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      // Only store if we're not already on an auth page and no redirect param is set
      if (
        !redirectUrlFromParams &&
        !currentPath.startsWith('/auth') &&
        !currentPath.startsWith('/login')
      ) {
        // Store it for potential future use (if user navigates between auth pages)
        const storedPath = sessionStorage.getItem('auth_redirect_url');
        if (!storedPath || storedPath === '/') {
          sessionStorage.setItem('auth_redirect_url', currentPath);
        }
      }
    }

    // Only use referrer if no redirect parameter is set
    if (!redirectUrlFromParams && typeof window !== 'undefined') {
      // First check sessionStorage (most reliable)
      const storedRedirect = sessionStorage.getItem('auth_redirect_url');
      if (storedRedirect) {
        try {
          // Validate it's a valid path (not an auth page)
          if (
            !storedRedirect.startsWith('/auth') &&
            !storedRedirect.startsWith('/login') &&
            storedRedirect.startsWith('/')
          ) {
            setReferrerUrl(storedRedirect);
            return;
          }
        } catch (e) {
          // Invalid, ignore
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
              // Also store it for future use
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;

      // Redirect to login with redirect parameter if available
      if (redirectUrl) {
        router.push(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`);
      } else {
        router.push('/auth/sign-up-success');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
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
            <CardTitle className="text-2xl">Join The Pattern's Place</CardTitle>
            {action === 'heart' ? (
              <CardDescription>
                Yay! You found something you like. Sign up so you can keep track of your favorite
                patterns!
              </CardDescription>
            ) : (
              <CardDescription>Create a new account to start exploring patterns</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a strong password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="Re-Enter your password"
                  required
                  value={repeatPassword}
                  onChange={e => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating an account...' : 'Sign up'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link
                href={
                  redirectUrl
                    ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}`
                    : action === 'heart'
                      ? `/auth/login?action=heart&redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`
                      : '/auth/login'
                }
                className="underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
