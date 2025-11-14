'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Settings, 
  LogOut, 
  ShoppingBag, 
  Package,
  Plus,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export function ProfileDropdown() {
  const router = useRouter();
  const { user, profile, signOut, loading, error } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Show loading state only if we don't have a user yet
  if (loading && !user) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
    );
  }

  // Only show login options if we're sure there's no user
  // If there's an error but we have a user, show the user (error might be temporary)
  // This prevents showing login when auth is temporarily unavailable
  if (!user && !loading) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 flex-shrink-0">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount>
          <DropdownMenuItem asChild onClick={() => setIsOpen(false)}>
            <Link href="/auth/login" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Sign in</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild onClick={() => setIsOpen(false)}>
            <Link href="/auth/sign-up" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Sign up</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 flex-shrink-0">
          <Avatar className="h-8 w-8" key={`${profile?.avatar_url || 'no-avatar'}-${profile?.updated_at || ''}`}>
            <AvatarImage 
              src={profile?.avatar_url ? `${profile.avatar_url.split('?')[0]}?v=${profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}` : ''} 
              alt={profile?.full_name || user.email || ''} 
            />
            <AvatarFallback className="text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/marketplace" className="flex items-center">
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span>Marketplace</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/my-products" className="flex items-center">
            <Package className="mr-2 h-4 w-4" />
            <span>My Products</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/marketplace/sell" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            <span>Sell Products</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
