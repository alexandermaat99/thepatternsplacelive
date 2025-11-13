'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { CartIcon } from '@/components/cart-icon';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, ShoppingBag, Package } from 'lucide-react';

interface NavigationProps {
  title?: string;
  showMarketplaceLinks?: boolean;
}

export function Navigation({ 
  showMarketplaceLinks = false 
}: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="w-full border-b border-b-foreground/10 h-12 sm:h-16">
      <div className="w-full max-w-5xl mx-auto h-full px-4 sm:px-6 relative">
        <div className="flex h-full items-center justify-between">
          {/* Left: Hamburger + Marketplace links */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showMarketplaceLinks && (
              <>
                {/* Hamburger menu, always visible on mobile */}
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="md:hidden h-8 w-8 p-0 relative"
                      aria-label="Menu"
                    >
                      <Menu 
                        className={`h-5 w-5 absolute transition-all duration-300 ${
                          isMenuOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                        }`}
                      />
                      <X 
                        className={`h-5 w-5 absolute transition-all duration-300 ${
                          isMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                        }`}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                      <Link href="/marketplace" className="flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        <span>Marketplace</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                      <Link href="/marketplace/sell" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Sell</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Marketplace links, visible on md+ screens */}
                <div className="hidden md:flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href="/marketplace" className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Marketplace</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href="/marketplace/sell" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Sell</span>
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Center: Logo - absolutely positioned */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <Link 
              href="/" 
              className="hover:opacity-80 transition-opacity flex items-center"
            >
              <Image 
                src="/logos/back_logo.svg" 
                alt="The Patterns Place" 
                width={120} 
                height={32} 
                className="h-6 sm:h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Right: Cart + Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <CartIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
}
