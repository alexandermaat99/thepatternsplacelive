'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserWithProfile, getStripeAccountStatus, type UserProfile, type StripeAccountStatus } from '@/lib/auth-helpers';

export interface AuthState {
  user: any;
  profile: UserProfile | null;
  stripeStatus: StripeAccountStatus;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    stripeStatus: {
      isConnected: false,
      isOnboarded: false,
      accountId: null,
      status: 'unknown'
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let isInitializing = false;

    const initializeAuth = async () => {
      if (isInitializing) {
        console.log('useAuth: Already initializing, skipping...');
        return;
      }
      
      isInitializing = true;
      
      try {
        console.log('useAuth: Initializing auth...');
        
        if (!mounted) return;
        
        // Try to get user first with a simple approach
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (authError) {
          console.error('useAuth: Auth error:', authError);
          // Don't clear user state on auth errors - might be temporary network issue
          // Only clear if it's a clear "not authenticated" error
          if (authError.message?.includes('JWT') || authError.message?.includes('session')) {
            console.log('useAuth: Session expired or invalid, clearing state');
            setAuthState(prev => ({ 
              ...prev, 
              user: null, 
              profile: null, 
              loading: false 
            }));
          } else {
            // Keep existing state on other errors (network issues, etc.)
            setAuthState(prev => ({ 
              ...prev, 
              loading: false,
              error: authError.message || 'Auth error'
            }));
          }
          return;
        }
        
        if (!user) {
          console.log('useAuth: No user found');
          setAuthState(prev => ({ 
            ...prev, 
            user: null, 
            profile: null, 
            loading: false 
          }));
          return;
        }

        console.log('useAuth: User found, trying to get profile...');
        
        // Try to get profile (with longer timeout for initial load)
        let profile = null;
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileError && profileData) {
            profile = profileData;
            console.log('useAuth: Profile loaded successfully');
          } else {
            console.log('useAuth: Profile not found or error:', profileError);
          }
        } catch (error) {
          console.log('useAuth: Profile query failed, continuing without profile:', error);
        }
        
        // Set initial state with user and profile (don't wait for Stripe)
        if (mounted) {
          console.log('useAuth: Setting initial auth state');
          setAuthState({
            user,
            profile,
            stripeStatus: {
              isConnected: false,
              isOnboarded: false,
              accountId: profile?.stripe_account_id || null,
              status: 'unknown'
            },
            loading: false,
            error: null
          });
        }

        // Check Stripe account status asynchronously (non-blocking)
        if (profile?.stripe_account_id) {
          console.log('useAuth: Checking Stripe status for account:', profile.stripe_account_id);
          // Don't await - let it run in background
          getStripeAccountStatus(profile.stripe_account_id)
            .then((stripeStatus) => {
              console.log('useAuth: Stripe status:', stripeStatus);
              if (mounted) {
                setAuthState(prev => ({
                  ...prev,
                  stripeStatus
                }));
              }
            })
            .catch((error) => {
              console.error('Error checking Stripe status:', error);
              if (mounted) {
                setAuthState(prev => ({
                  ...prev,
                  stripeStatus: {
                    isConnected: true,
                    isOnboarded: false,
                    accountId: profile.stripe_account_id,
                    status: 'error'
                  }
                }));
              }
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }));
        }
      } finally {
        isInitializing = false;
        // Clear timeout when initialization completes (success or error)
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Set a timeout to prevent infinite loading (increased to 10 seconds)
    timeoutId = setTimeout(() => {
      if (mounted && isInitializing) {
        console.log('useAuth: Timeout reached, stopping loading');
        // Don't clear user state on timeout - might just be slow network
        // Keep existing user state if we have it
        setAuthState(prev => ({ 
          ...prev, 
          loading: false,
          // Only set error if we don't have a user (actual timeout)
          // If we have a user, it's just a slow profile fetch
          error: prev.user ? null : 'Authentication timeout'
        }));
        isInitializing = false;
      }
    }, 10000); // 10 second timeout

    initializeAuth();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Clear any existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          await initializeAuth();
        }
      }
    );

    return () => {
      mounted = false;
      isInitializing = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const refreshStripeStatus = async () => {
    if (!authState.profile?.stripe_account_id) return;

    try {
      const stripeStatus = await getStripeAccountStatus(authState.profile.stripe_account_id);
      setAuthState(prev => ({ ...prev, stripeStatus }));
    } catch (error) {
      console.error('Error refreshing Stripe status:', error);
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!authState.user) {
      console.log('[AVATAR DEBUG] refreshProfile: No user found');
      return null;
    }

    console.log('[AVATAR DEBUG] refreshProfile: Starting refresh for user:', authState.user.id);
    console.log('[AVATAR DEBUG] refreshProfile: Current profile:', authState.profile);

    try {
      const supabase = createClient();
      
      // Add a small delay to ensure DB write has propagated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authState.user.id)
        .single();

      if (error) {
        console.error('[AVATAR DEBUG] refreshProfile: Error fetching profile:', error);
        return null;
      }

      console.log('[AVATAR DEBUG] refreshProfile: Fetched profile from DB:', updatedProfile);
      console.log('[AVATAR DEBUG] refreshProfile: Old avatar_url:', authState.profile?.avatar_url);
      console.log('[AVATAR DEBUG] refreshProfile: New avatar_url:', updatedProfile?.avatar_url);
      console.log('[AVATAR DEBUG] refreshProfile: URLs match?', authState.profile?.avatar_url === updatedProfile?.avatar_url);

      if (updatedProfile) {
        // Update profile in state
        console.log('[AVATAR DEBUG] refreshProfile: Updating state with new profile');
        setAuthState(prev => {
          const newState = { ...prev, profile: updatedProfile };
          console.log('[AVATAR DEBUG] refreshProfile: New state profile:', newState.profile);
          return newState;
        });
        console.log('[AVATAR DEBUG] refreshProfile: State updated');
        return updatedProfile;
      } else {
        console.log('[AVATAR DEBUG] refreshProfile: No profile data returned');
        return null;
      }
    } catch (error) {
      console.error('[AVATAR DEBUG] refreshProfile: Exception:', error);
      return null;
    }
  };

  const signOut = async () => {
    try {
      console.log('useAuth: Signing out...');
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('useAuth: Sign out successful');
        // Reset auth state immediately
        setAuthState({
          user: null,
          profile: null,
          stripeStatus: {
            isConnected: false,
            isOnboarded: false,
            accountId: null,
            status: 'unknown'
          },
          loading: false,
          error: null
        });
        
        // Force redirect to home page
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return {
    ...authState,
    refreshStripeStatus,
    refreshProfile,
    signOut,
    isAuthenticated: !!authState.user,
    canSell: authState.stripeStatus.isOnboarded
  };
}
