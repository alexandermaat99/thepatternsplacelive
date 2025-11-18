'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { 
  User, 
  Settings, 
  LogOut, 
  ShoppingBag, 
  Package,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export function ProfileDropdown() {
  const { user, profile, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[ProfileDropdown] ===== STATE UPDATE =====');
    console.log('[ProfileDropdown] hasUser:', !!user);
    console.log('[ProfileDropdown] userId:', user?.id);
    console.log('[ProfileDropdown] email:', user?.email);
    console.log('[ProfileDropdown] hasProfile:', !!profile);
    console.log('[ProfileDropdown] profileAvatar:', profile?.avatar_url);
    console.log('[ProfileDropdown] loading:', loading);
    console.log('[ProfileDropdown] Will render authenticated?', !!user && !loading);
    console.log('[ProfileDropdown] =======================');
  }, [user, profile, loading]);

  const getInitials = () => {
    if (profile?.full_name?.trim()) {
      return profile.full_name
        .trim()
        .split(/\s+/)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return undefined;
    const baseUrl = profile.avatar_url.split('?')[0];
    const timestamp = profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now();
    return `${baseUrl}?v=${timestamp}`;
  };

  const handleSignOut = async () => {
    console.log('[ProfileDropdown] Sign out initiated');
    setIsOpen(false);
    try {
      await signOut();
      console.log('[ProfileDropdown] Sign out successful');
    } catch (error) {
      console.error('[ProfileDropdown] Sign out error:', error);
    }
  };

  // Loading state
  if (loading && !user) {
    console.log('[ProfileDropdown] Rendering LOADING state');
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    );
  }

  // Authenticated state
  if (user) {
    console.log('[ProfileDropdown] Rendering AUTHENTICATED state');
    const avatarUrl = getAvatarUrl();
    const initials = getInitials();
    
    console.log('[ProfileDropdown] Rendering authenticated state', { 
      userId: user.id, 
      avatarUrl,
      initials 
    });

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger 
          className="h-8 w-8 rounded-full p-0 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          onClick={(e) => {
            console.log('[ProfileDropdown] Trigger clicked!', e);
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            console.log('[ProfileDropdown] Trigger mouseDown!', e);
          }}
        >
          <Avatar 
            className="h-8 w-8 pointer-events-none"
            onClick={(e) => {
              console.log('[ProfileDropdown] Avatar clicked!', e);
              e.stopPropagation();
            }}
          >
            <AvatarImage 
              src={avatarUrl} 
              alt={profile?.full_name || user.email || 'User'}
            />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/marketplace" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Marketplace</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/my-products" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
              <Package className="mr-2 h-4 w-4" />
              <span>My Products</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/marketplace/sell" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Sell Products</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={(e) => {
              console.log('[ProfileDropdown] Sign out onSelect triggered');
              e.preventDefault();
              handleSignOut();
            }}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Unauthenticated state
  console.log('[ProfileDropdown] Rendering UNAUTHENTICATED state');
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="h-8 w-8 rounded-full p-0 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer flex items-center justify-center">
        <User className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/auth/login" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
            <User className="mr-2 h-4 w-4" />
            <span>Sign in</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/auth/sign-up" className="flex items-center w-full" onClick={() => setIsOpen(false)}>
            <User className="mr-2 h-4 w-4" />
            <span>Sign up</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
