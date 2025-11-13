'use client';

import Link from 'next/link';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { CartIcon } from '@/components/cart-icon';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Package } from 'lucide-react';

interface NavigationProps {
  title?: string;
  showMarketplaceLinks?: boolean;
}

export function Navigation({ 
  title = "The Patterns Place", 
  showMarketplaceLinks = false 
}: NavigationProps) {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {title}
          </Link>
          {showMarketplaceLinks && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/marketplace" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Marketplace
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/marketplace/sell" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sell
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CartIcon />
          <ThemeSwitcher />
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  );
}
