import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface StripeAccountStatus {
  isConnected: boolean;
  isOnboarded: boolean;
  accountId: string | null;
  status: 'unknown' | 'pending' | 'onboarded' | 'error' | 'pending_verification' | 'requires_info';
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requiresMoreInfo?: boolean;
  pendingVerification?: boolean;
  requirementsDue?: string[];
  accountType?: 'standard' | 'express' | 'custom';
}

// Client-side helper to get current user and profile
export async function getCurrentUserWithProfile(): Promise<{
  user: any;
  profile: UserProfile | null;
} | null> {
  try {
    console.log('getCurrentUserWithProfile: Starting...');
    const supabase = createClient();
    
    console.log('getCurrentUserWithProfile: Getting user...');
    
    // Add timeout to auth.getUser() call
    const authPromise = supabase.auth.getUser();
    const authTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth getUser timeout')), 3000)
    );
    
    const { data: { user }, error: authError } = await Promise.race([
      authPromise,
      authTimeoutPromise
    ]) as any;
    
    if (authError) {
      console.error('getCurrentUserWithProfile: Auth error:', authError);
      return null;
    }
    
    if (!user) {
      console.log('getCurrentUserWithProfile: No user found');
      return null;
    }

    console.log('getCurrentUserWithProfile: User found, fetching profile...');
    
    try {
      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      );
      
      const { data: profile, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        console.error('getCurrentUserWithProfile: Profile error:', profileError);
        return { user, profile: null };
      }

      console.log('getCurrentUserWithProfile: Success, returning user and profile');
      return { user, profile };
    } catch (profileError) {
      console.error('getCurrentUserWithProfile: Profile query failed:', profileError);
      // Return user without profile if profile query fails
      return { user, profile: null };
    }
  } catch (error) {
    console.error('getCurrentUserWithProfile: Unexpected error:', error);
    return null;
  }
}


// Check Stripe account status
export async function getStripeAccountStatus(accountId: string): Promise<StripeAccountStatus> {
  if (!accountId) {
    return {
      isConnected: false,
      isOnboarded: false,
      accountId: null,
      status: 'unknown'
    };
  }

  try {
    const response = await fetch('/api/check-stripe-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        isConnected: true,
        isOnboarded: false,
        accountId,
        status: 'error'
      };
    }

    return {
      isConnected: true,
      isOnboarded: data.status === 'onboarded',
      accountId,
      status: data.status
    };
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    return {
      isConnected: true,
      isOnboarded: false,
      accountId,
      status: 'error'
    };
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }

  return true;
}

// Create or update user profile
export async function createOrUpdateProfile(profileData: {
  full_name?: string;
  avatar_url?: string;
  stripe_account_id?: string;
  username?: string;
}): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...profileData,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error creating/updating profile:', error);
    return false;
  }

  return true;
}

// Validate username format
export function validateUsernameFormat(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return { valid: true };
}

// Check if username is available
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { available: false, error: 'Not authenticated' };
  }

  // Validate format first
  const formatCheck = validateUsernameFormat(username);
  if (!formatCheck.valid) {
    return { available: false, error: formatCheck.error };
  }

  // Check if username is taken by another user
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', username.toLowerCase())
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is what we want
    console.error('Error checking username:', error);
    return { available: false, error: 'Error checking username availability' };
  }

  // If data exists and it's not the current user, username is taken
  if (data && data.id !== user.id) {
    return { available: false, error: 'Username is already taken' };
  }

  return { available: true };
}
