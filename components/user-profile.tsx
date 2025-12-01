'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { AvatarUpload } from '@/components/avatar-upload';
import { ExternalLink, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserProfile as UserProfileType, StripeAccountStatus } from '@/lib/auth-helpers';
import { UsernameEditor } from '@/components/username-editor';

interface UserProfileProps {
  // Optional props from server component - if provided, use these instead of useAuth
  serverUser?: any;
  serverProfile?: UserProfileType | null;
  serverStripeStatus?: StripeAccountStatus;
}

export function UserProfile({
  serverUser,
  serverProfile,
  serverStripeStatus,
}: UserProfileProps = {}) {
  const router = useRouter();
  const authHook = useAuth();

  // Use server props if available, otherwise fall back to useAuth hook
  const user = serverUser || authHook.user;
  const profile = serverProfile !== undefined ? serverProfile : authHook.profile;
  const stripeStatus = serverStripeStatus || authHook.stripeStatus;
  const loading = serverUser ? false : authHook.loading; // If server props provided, not loading
  const isAuthenticated = serverUser ? !!serverUser : authHook.isAuthenticated;
  const canSell = stripeStatus?.isOnboarded || false;
  const refreshStripeStatus = authHook.refreshStripeStatus;
  const refreshProfile = authHook.refreshProfile;
  const signOut = authHook.signOut;
  const openAuthModal = authHook.openAuthModal;

  const [currentProfile, setCurrentProfile] = useState(profile);

  // Update local profile state when profile changes
  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const handleAvatarUpload = async (avatarUrl: string | null) => {
    console.log('[AVATAR DEBUG] handleAvatarUpload called with URL:', avatarUrl);
    console.log('[AVATAR DEBUG] Current profile before refresh:', profile);
    console.log('[AVATAR DEBUG] Current profile avatar_url:', profile?.avatar_url);

    if (!avatarUrl) {
      // Photo was removed
      await refreshProfile();
      return;
    }

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Refresh profile and get the updated profile
    console.log('[AVATAR DEBUG] Calling refreshProfile...');
    const updatedProfile = await refreshProfile();

    if (updatedProfile) {
      console.log('[AVATAR DEBUG] Updated profile received:', updatedProfile);
      console.log('[AVATAR DEBUG] Updated avatar_url:', updatedProfile.avatar_url);
      console.log('[AVATAR DEBUG] Expected avatar_url:', avatarUrl);
      console.log('[AVATAR DEBUG] URLs match?', updatedProfile.avatar_url === avatarUrl);

      // Check if the URL matches
      if (updatedProfile.avatar_url !== avatarUrl) {
        console.error(
          "[AVATAR DEBUG] URLs don't match! DB has:",
          updatedProfile.avatar_url,
          'Expected:',
          avatarUrl
        );
        // Try one more refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryProfile = await refreshProfile();
        if (retryProfile && retryProfile.avatar_url !== avatarUrl) {
          console.error('[AVATAR DEBUG] Still mismatched after retry. Forcing reload...');
          setTimeout(() => window.location.reload(), 500);
        }
      } else {
        console.log('[AVATAR DEBUG] URLs match! Success!');
      }
    } else {
      console.error('[AVATAR DEBUG] refreshProfile returned null! Forcing reload...');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const userInitials = currentProfile?.full_name
    ? currentProfile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleUsernameUpdate = async (newUsername: string) => {
    const response = await fetch('/api/profile/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update username');
    }

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    // Refresh profile and get the updated profile
    const updatedProfile = await refreshProfile();

    if (updatedProfile) {
      // Update local state immediately
      setCurrentProfile(updatedProfile);

      // Verify the username was updated correctly
      if (updatedProfile.username?.toLowerCase() !== newUsername.toLowerCase()) {
        // If not matching, try one more refresh
        await new Promise(resolve => setTimeout(resolve, 300));
        const retryProfile = await refreshProfile();
        if (retryProfile) {
          setCurrentProfile(retryProfile);
        }
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
          <Button onClick={() => openAuthModal('login')}>Log In</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          {user && !loading && (
            <div className="flex justify-center pb-4 border-b">
              <AvatarUpload
                currentAvatarUrl={currentProfile?.avatar_url || profile?.avatar_url}
                userId={user.id}
                userInitials={userInitials}
                onUploadComplete={handleAvatarUpload}
              />
            </div>
          )}

          <div className="space-y-4">
            <UsernameEditor
              currentUsername={currentProfile?.username || profile?.username || null}
              onUpdate={handleUsernameUpdate}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Name:</span>
                <p className="text-sm text-muted-foreground">
                  {currentProfile?.full_name || 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Email:</span>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium">User ID:</span>
                <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Member Since:</span>
                <p className="text-sm text-muted-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
