'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageLoading } from '@/components/page-loading';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side auth wrapper that shows the auth modal if the user is not logged in.
 * Use this to protect client-side routes and show the modal instead of redirecting.
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading, openAuthModal, authModal } = useAuth();
  const modalWasOpen = useRef(false);
  const justLoggedIn = useRef(false);

  // Check if we just came from a login (check sessionStorage or URL params)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if there's a flag indicating we just logged in
      const loginFlag = sessionStorage.getItem('just_logged_in');
      if (loginFlag) {
        justLoggedIn.current = true;
        // Clear the flag after a short delay to allow auth to initialize
        setTimeout(() => {
          sessionStorage.removeItem('just_logged_in');
          justLoggedIn.current = false;
        }, 2000);
      }
    }
  }, []);

  useEffect(() => {
    // Don't open modal if we just logged in (give auth context time to initialize)
    // Also add a small delay to prevent race conditions
    if (!loading && !user && !justLoggedIn.current) {
      // Small delay to ensure auth context has had time to initialize
      const timeoutId = setTimeout(() => {
        if (!justLoggedIn.current) {
          openAuthModal('login', {
            redirectUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
          });
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [loading, user, openAuthModal]);

  // Track when modal was open and redirect if closed without logging in
  useEffect(() => {
    if (authModal.isOpen) {
      modalWasOpen.current = true;
    } else if (modalWasOpen.current && !user && !loading) {
      // Modal was closed but user didn't log in, redirect to marketplace
      modalWasOpen.current = false;
      router.push('/marketplace');
    }
  }, [authModal.isOpen, user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return fallback || <PageLoading />;
  }

  // If not authenticated, show fallback or loading (modal will be open)
  if (!user) {
    return fallback || <PageLoading />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

