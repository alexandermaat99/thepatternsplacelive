'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { User, LogOut, ShoppingBag, Package, Plus } from 'lucide-react';
import Link from 'next/link';

export function ProfileDropdown() {
  const { user, profile, signOut, loading, openAuthModal, canSell } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Loading state
  if (loading && !user) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  // Authenticated state
  if (user) {
    const avatarUrl = getAvatarUrl();
    const initials = getInitials();

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          className="flex items-center gap-2 h-8 px-1 rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <Avatar className="h-8 w-8 pointer-events-none">
            <AvatarImage src={avatarUrl} alt={profile?.full_name || user.email || 'User'} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {profile?.pattern_points !== null && profile?.pattern_points !== undefined && (
            <Badge className="text-xs font-semibold shrink-0 bg-rose-300 text-white border-0">
              {profile.pattern_points} pts
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard"
              className="flex items-center w-full"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/marketplace"
              className="flex items-center w-full"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Marketplace</span>
            </Link>
          </DropdownMenuItem>
          {canSell && (
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/my-products"
                className="flex items-center w-full"
                onClick={() => setIsOpen(false)}
              >
                <Package className="mr-2 h-4 w-4" />
                <span>My Products</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              href="/marketplace/sell"
              className="flex items-center w-full"
              onClick={() => setIsOpen(false)}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Sell Patterns</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={e => {
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
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="h-8 w-8 rounded-full p-0 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer flex items-center justify-center">
        <User className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            openAuthModal('login');
          }}
          className="flex items-center w-full cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Sign in</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            openAuthModal('signup');
          }}
          className="flex items-center w-full cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Sign up</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
