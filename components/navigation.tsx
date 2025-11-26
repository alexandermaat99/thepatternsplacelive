'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { CartIcon } from '@/components/cart-icon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, ShoppingBag, Package } from 'lucide-react';

interface NavigationProps {
  showMarketplaceLinks?: boolean;
}

export function Navigation({ showMarketplaceLinks = false }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 h-14">
        <div className="grid grid-cols-3 h-full items-center">
          {/* Left: Hamburger + Marketplace links */}
          <div className="flex items-center gap-2 justify-start">
            {showMarketplaceLinks && (
              <>
                {/* Mobile menu */}
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden"
                      aria-label="Menu"
                    >
                      {isMenuOpen ? (
                        <X className="h-5 w-5" />
                      ) : (
                        <Menu className="h-5 w-5" />
                      )}
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
                
                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/marketplace" className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Marketplace</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/marketplace/sell" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Sell</span>
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Center: Logo */}
          <div className="flex items-center justify-center">
            <Link 
              href="/" 
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logos/back_logo.svg" 
                alt="The Patterns Place" 
                className="h-6 sm:h-8 w-auto"
              />
            </Link>
          </div>

          {/* Right: Cart + Profile */}
          <div className="flex items-center gap-2 justify-end">
            <CartIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
}
