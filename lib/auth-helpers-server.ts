import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import type { UserProfile, StripeAccountStatus } from './auth-helpers';

// Server-side helper to get current user and profile
export async function getCurrentUserWithProfileServer(): Promise<{
  user: any;
  profile: UserProfile | null;
} | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return { user, profile: null };
  }

  return { user, profile };
}

// Server-side helper to get Stripe account status
export async function getStripeAccountStatusServer(accountId: string | null): Promise<StripeAccountStatus> {
  if (!accountId) {
    return {
      isConnected: false,
      isOnboarded: false,
      accountId: null,
      status: 'unknown'
    };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const isOnboarded = account.details_submitted && account.charges_enabled;
    
    return {
      isConnected: true,
      isOnboarded,
      accountId,
      status: isOnboarded ? 'onboarded' : 'pending'
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
