'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { COMPANY_INFO, getCopyrightText } from '@/lib/company-info';
import { useAuth } from '@/contexts/auth-context';
import { AuthLink } from '@/components/auth-link';

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc =
    mounted && resolvedTheme === 'dark' ? '/logos/back_logo_light.svg' : '/logos/back_logo.svg';

  return (
    <footer className="w-full border-t bg-muted/30 mt-auto">
      <div className="container mx-auto max-w-screen-xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <img src={logoSrc} alt={COMPANY_INFO.name} className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground">{COMPANY_INFO.tagline}</p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/marketplace"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse Patterns
                </Link>
              </li>
              <li>
                <AuthLink
                  href="/marketplace/sell"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sell Your Patterns
                </AuthLink>
              </li>
              <li>
                <Link
                  href="/marketplace/difficulty-levels"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Difficulty Levels
                </Link>
              </li>
            </ul>
          </div>

          {/* Account - only show when logged in */}
          {user && (
            <div>
              <h3 className="font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/my-products"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    My Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/favorites"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Favorites
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Settings */}
          <div>
            <h3 className="font-semibold mb-4">Settings</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Theme:</span>
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>{getCopyrightText()}</p>
            <div className="flex gap-6">
              <Link
                href={COMPANY_INFO.urls.privacy}
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href={COMPANY_INFO.urls.terms}
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
