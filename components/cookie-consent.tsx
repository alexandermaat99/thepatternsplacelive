'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  COOKIE_CONSENT_KEY,
  OPEN_COOKIE_SETTINGS_EVENT,
  applyConsentChoice,
  type ConsentChoice,
} from '@/lib/cookie-consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let consent: string | null = null;
    try {
      consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {
      // Storage blocked: show the banner.
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!consent) {
      // Small delay to prevent flash on page load
      timer = setTimeout(() => setShowBanner(true), 1000);
    }

    // "Cookie settings" link in the footer re-opens the banner.
    const open = () => setShowBanner(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    };
  }, []);

  const choose = (choice: ConsentChoice) => {
    applyConsentChoice(choice);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">🍪 Cookie Notice</h3>
            <p className="text-sm text-muted-foreground">
              We use essential cookies to keep you signed in and make the site work. With your
              permission, we also use Google Analytics cookies to understand how the site is used
              so we can improve it. You can change your choice anytime from &quot;Cookie
              settings&quot; at the bottom of any page.{' '}
              <Link href="/privacy#cookies" className="underline hover:text-foreground transition-colors">
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => choose('declined')}
              className="flex-1 sm:flex-none"
            >
              Decline
            </Button>
            <Button size="sm" onClick={() => choose('accepted')} className="flex-1 sm:flex-none">
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
