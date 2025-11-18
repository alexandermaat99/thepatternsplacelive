'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserWithProfile, getStripeAccountStatus, type UserProfile, type StripeAccountStatus } from '@/lib/auth-helpers';

export interface AuthState {
  user: any;
  profile: UserProfile | null;
  stripeStatus: StripeAccountStatus;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  refreshStripeStatus: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  canSell: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    let initTimeout: NodeJS.Timeout;
    let isInitializing = false;

    const initializeAuth = async () => {
      if (isInitializing) {
        return;
      }
      
      isInitializing = true;
      
      try {
        if (!mounted) return;
        
        const supabase = createClient();
        
        // First, try to get the session to ensure cookies are read
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Then get the user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (authError) {
          // Only clear user if it's a clear authentication error
          if (authError.message?.includes('JWT') || authError.message?.includes('session') || authError.message?.includes('Invalid')) {
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
          isInitializing = false;
          return;
        }
        
        if (!user) {
          setAuthState(prev => ({ 
            ...prev, 
            user: null, 
            profile: null, 
            loading: false 
          }));
          isInitializing = false;
          return;
        }

        // Get profile quickly
        let profile = null;
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profileData) {
            profile = profileData;
          }
        } catch (error) {
          // Profile might not exist yet, that's okay - we'll show user with email initial
        }
        
        // Set user immediately, even if profile is null
        if (mounted) {
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

        // Check Stripe status asynchronously (non-blocking)
        if (profile?.stripe_account_id) {
          getStripeAccountStatus(profile.stripe_account_id)
            .then((stripeStatus) => {
              if (mounted) {
                setAuthState(prev => ({
                  ...prev,
                  stripeStatus
                }));
              }
            })
            .catch(() => {
              // Ignore Stripe errors, not critical
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
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Set a timeout (5 seconds)
    timeoutId = setTimeout(() => {
      if (mounted && isInitializing) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false,
          error: prev.user ? null : 'Authentication timeout'
        }));
        isInitializing = false;
      }
    }, 5000);

    // Initialize immediately
    initializeAuth();
    
    // Also check after a short delay for page reloads (using a ref to avoid stale closure)
    initTimeout = setTimeout(() => {
      if (mounted) {
        // Check current state and re-initialize if needed
        setAuthState(prev => {
          if (!prev.user && prev.loading) {
            // Still loading and no user, try again
            initializeAuth();
          }
          return prev;
        });
      }
    }, 500);

    // Listen for auth changes - CRITICAL for detecting login
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'User ID:', session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('SIGNED_IN detected, updating state immediately');
          isInitializing = false;
          if (timeoutId) clearTimeout(timeoutId);
          
          // Get profile - but don't wait for it, set user immediately
          const fetchProfile = async () => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (!profileError && profileData && mounted) {
                console.log('Profile loaded:', profileData);
                setAuthState(prev => ({
                  ...prev,
                  profile: profileData,
                  stripeStatus: {
                    ...prev.stripeStatus,
                    accountId: profileData?.stripe_account_id || null,
                  }
                }));
              } else {
                console.log('No profile found or error:', profileError);
              }
            } catch (error) {
              console.log('Profile fetch error (non-critical):', error);
            }
          };
          
          // Set user IMMEDIATELY, profile can load async
          if (mounted) {
            console.log('Setting auth state with user:', session.user.id, session.user.email);
            setAuthState(prev => {
              const newState = {
                user: session.user,
                profile: prev.profile, // Keep existing profile if any
                stripeStatus: {
                  isConnected: false,
                  isOnboarded: false,
                  accountId: prev.profile?.stripe_account_id || null,
                  status: 'unknown'
                },
                loading: false,
                error: null
              };
              console.log('New auth state:', newState);
              return newState;
            });
            console.log('Auth state updated - user set');
            
            // Fetch profile in background
            fetchProfile();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('SIGNED_OUT detected');
          if (mounted) {
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
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('TOKEN_REFRESHED detected');
          isInitializing = false;
          await initializeAuth();
        }
      }
    );

    return () => {
      mounted = false;
      isInitializing = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (initTimeout) clearTimeout(initTimeout);
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
    if (!authState.user) return null;
    try {
      const supabase = createClient();
      await new Promise(resolve => setTimeout(resolve, 200));
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authState.user.id)
        .single();
      if (error || !updatedProfile) return null;
      setAuthState(prev => ({ ...prev, profile: updatedProfile }));
      return updatedProfile;
    } catch (error) {
      return null;
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
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
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    ...authState,
    refreshStripeStatus,
    refreshProfile,
    signOut,
    isAuthenticated: !!authState.user,
    canSell: authState.stripeStatus.isOnboarded
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

