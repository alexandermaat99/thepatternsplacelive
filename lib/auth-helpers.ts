import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StripeAccountStatus {
  isConnected: boolean;
  isOnboarded: boolean;
  accountId: string | null;
  status: 'unknown' | 'pending' | 'onboarded' | 'error';
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
