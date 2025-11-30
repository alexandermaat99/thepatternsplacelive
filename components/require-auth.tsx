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

  useEffect(() => {
    // If not loading and no user, open the auth modal
    if (!loading && !user) {
      openAuthModal('login', {
        redirectUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
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

