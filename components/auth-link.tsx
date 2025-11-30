'use client';

import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, MouseEvent } from 'react';

interface AuthLinkProps extends ComponentProps<typeof Link> {
  children: React.ReactNode;
}

/**
 * A Link component that checks authentication before navigating.
 * If user is not logged in, it opens the auth modal instead of navigating.
 * The user stays on their current page until they successfully log in.
 */
export function AuthLink({ children, href, onClick, ...props }: AuthLinkProps) {
  const { user, loading, openAuthModal } = useAuth();
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // If still loading auth state, let the link work normally
    if (loading) {
      return;
    }

    // If user is authenticated, proceed with navigation
    if (user) {
      onClick?.(e);
      return;
    }

    // User is not authenticated - prevent navigation and show modal
    e.preventDefault();
    
    // Open auth modal with redirect URL set to the intended destination
    const destination = typeof href === 'string' ? href : href.pathname || '/';
    openAuthModal('login', {
      redirectUrl: destination,
    });
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

