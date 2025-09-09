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
        
        if (authError || !user) {
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
        
        // Try to get profile with timeout
        let profile = null;
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          const profileTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile timeout')), 2000)
          );
          
          const { data: profileData, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]) as any;

          if (!profileError && profileData) {
            profile = profileData;
            console.log('useAuth: Profile loaded successfully');
          } else {
            console.log('useAuth: Profile not found or error:', profileError);
          }
        } catch (error) {
          console.log('useAuth: Profile query failed, continuing without profile:', error);
        }
        
        // Check Stripe account status if we have an account ID
        let stripeStatus: StripeAccountStatus = {
          isConnected: false,
          isOnboarded: false,
          accountId: null,
          status: 'unknown'
        };

        if (profile?.stripe_account_id) {
          console.log('useAuth: Checking Stripe status for account:', profile.stripe_account_id);
          try {
            stripeStatus = await getStripeAccountStatus(profile.stripe_account_id);
            console.log('useAuth: Stripe status:', stripeStatus);
          } catch (error) {
            console.error('Error checking Stripe status:', error);
            stripeStatus = {
              isConnected: true,
              isOnboarded: false,
              accountId: profile.stripe_account_id,
              status: 'error'
            };
          }
        }

        if (mounted) {
          console.log('useAuth: Setting final auth state');
          setAuthState({
            user,
            profile,
            stripeStatus,
            loading: false,
            error: null
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
      }
    };

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && isInitializing) {
        console.log('useAuth: Timeout reached, stopping loading');
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Authentication timeout' 
        }));
        isInitializing = false;
      }
    }, 4000); // 4 second timeout

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
    signOut,
    isAuthenticated: !!authState.user,
    canSell: authState.stripeStatus.isOnboarded
  };
}
