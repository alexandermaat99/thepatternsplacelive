'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FeedbackBubble } from '@/components/feedback-bubble';
import { COOKIE_BANNER_VISIBILITY_EVENT, isCookieBannerVisible } from '@/lib/cookie-consent';

export function FeedbackBubbleConditional() {
  const pathname = usePathname();
  // Step aside while the cookie banner is open (they overlap on mobile).
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);

  useEffect(() => {
    setCookieBannerOpen(isCookieBannerVisible());
    const onChange = (e: Event) => setCookieBannerOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener(COOKIE_BANNER_VISIBILITY_EVENT, onChange);
    return () => window.removeEventListener(COOKIE_BANNER_VISIBILITY_EVENT, onChange);
  }, []);

  if (pathname?.startsWith('/admin') || cookieBannerOpen) {
    return null;
  }
  return <FeedbackBubble />;
}
