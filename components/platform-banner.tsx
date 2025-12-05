'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_INFO } from '@/lib/company-info';
import Link from 'next/link';

const BANNER_DISMISSED_KEY = 'platform-banner-dismissed';

export function PlatformBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner should be shown
    if (!COMPANY_INFO.banner.showNewPlatformBanner) {
      return;
    }

    // Check if user has dismissed it
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Show banner with a slight delay for smooth animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  // Don't render if banner is disabled or dismissed
  if (!COMPANY_INFO.banner.showNewPlatformBanner || isDismissed) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r from-[#E8A598]/30 via-[#E8A598]/10 to-[#E8A598]/50 border-b border-[#E8A598]/20 transition-all duration-300 ${
        isVisible ? 'opacity-100 max-h-32 md:max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
      }`}
    >
      <div className="container mx-auto px-4 py-3 md:py-6">
        <div className="flex items-center justify-center gap-4 relative">
          <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
            <Sparkles className="h-5 w-5 text-[#ffad9c] flex-shrink-0" />
            <p className="text-sm md:text-base text-foreground text-center">
              Welcome! We're a <span className="font-bold text-[#ffa18e]">brand new</span>{' '}
              marketplace for sewing, knitting, and other patterns. Help us grow by listing your
              patterns or sharing our site!{' '}
              <Link
                href="/marketplace/sell"
                className="font-semibold text-[#ff927c] hover:text-[#f4654b] hover:underline inline-flex items-center transition-colors"
              >
                Sell a Pattern →
              </Link>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 h-8 w-8 p-0 hover:bg-[#E8A598]/10 absolute right-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
