'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Start every new page at the very top.
 *
 * Next.js scrolls the new page's first non-sticky element into view. Our nav
 * is sticky and lives inside each page, so pages landed scrolled down by the
 * nav's height (the "Back to home" link hidden under the nav). This runs after
 * Next's own scroll and puts the window at 0.
 *
 * Skipped for back/forward (keep the browser's restored position) and for
 * links to a #section.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const isHistoryNav = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isHistoryNav.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isHistoryNav.current) {
      isHistoryNav.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
