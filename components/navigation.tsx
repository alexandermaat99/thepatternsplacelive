'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { CartIcon } from '@/components/cart-icon';
import { AuthLink } from '@/components/auth-link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, ShoppingBag, Package, Home, Info } from 'lucide-react';

interface NavigationProps {
  showMarketplaceLinks?: boolean;
}

export function Navigation({ showMarketplaceLinks = false }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const logoTriggerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use dark logo for light mode, light logo for dark mode
  const logoSrc =
    mounted && resolvedTheme === 'dark' ? '/logos/back_logo_light.svg' : '/logos/back_logo.svg';

  // Handle hover menu for logo (desktop)
  const handleLogoMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsLogoMenuOpen(true);
  };

  const handleLogoMouseLeave = () => {
    // Small delay to allow moving mouse to menu
    closeTimeoutRef.current = setTimeout(() => {
      setIsLogoMenuOpen(false);
    }, 150);
  };

  const handleMenuMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsLogoMenuOpen(true);
  };

  const handleMenuMouseLeave = () => {
    setIsLogoMenuOpen(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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
                    <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                      {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                      <AuthLink href="/marketplace/sell" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Sell</span>
                      </AuthLink>
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
                    <AuthLink href="/marketplace/sell" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Sell</span>
                    </AuthLink>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Center: Logo with hover menu */}
          <div className="flex items-center justify-center">
            <div
              ref={logoTriggerRef}
              className="relative"
              onMouseEnter={handleLogoMouseEnter}
              onMouseLeave={handleLogoMouseLeave}
            >
              {/* Mobile: Click to open */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsLogoMenuOpen(!isLogoMenuOpen)}
                  className="flex items-center hover:opacity-80 transition-opacity"
                  aria-label="Logo menu"
                >
                  <img src={logoSrc} alt="The Patterns Place" className="h-6 sm:h-8 w-auto" />
                </button>
              </div>
              {/* Desktop: Hover to open */}
              <div className="hidden md:block">
                <div className="flex items-center hover:opacity-80 transition-opacity cursor-pointer">
                  <img src={logoSrc} alt="The Patterns Place" className="h-6 sm:h-8 w-auto" />
                </div>
              </div>

              {/* Dropdown menu */}
              {isLogoMenuOpen && (
                <div
                  ref={logoMenuRef}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleMenuMouseLeave}
                >
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => setIsLogoMenuOpen(false)}
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                  <Link
                    href="/about"
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => setIsLogoMenuOpen(false)}
                  >
                    <Info className="h-4 w-4" />
                    <span>About Us</span>
                  </Link>
                </div>
              )}
            </div>
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
