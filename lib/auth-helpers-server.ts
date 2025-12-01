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

// Extended Stripe account status with more details
export interface ExtendedStripeAccountStatus extends StripeAccountStatus {
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requiresMoreInfo?: boolean;
  pendingVerification?: boolean;
  requirementsDue?: string[];
  accountType?: 'standard' | 'express' | 'custom';
}

// Server-side helper to get Stripe account status
export async function getStripeAccountStatusServer(accountId: string | null): Promise<ExtendedStripeAccountStatus> {
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
    
    const detailsSubmitted = account.details_submitted ?? false;
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const isOnboarded = detailsSubmitted && chargesEnabled;
    
    // Check if there are pending requirements
    const currentlyDue = account.requirements?.currently_due || [];
    const pendingVerification = account.requirements?.pending_verification || [];
    const requiresMoreInfo = currentlyDue.length > 0;
    const isPendingVerification = pendingVerification.length > 0;
    
    // Determine status
    let status: 'unknown' | 'pending' | 'onboarded' | 'error' | 'pending_verification' | 'requires_info';
    if (isOnboarded) {
      status = 'onboarded';
    } else if (isPendingVerification) {
      status = 'pending_verification';
    } else if (requiresMoreInfo) {
      status = 'requires_info';
    } else if (detailsSubmitted) {
      status = 'pending';
    } else {
      status = 'pending';
    }
    
    return {
      isConnected: true,
      isOnboarded,
      accountId,
      status,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      requiresMoreInfo,
      pendingVerification: isPendingVerification,
      requirementsDue: currentlyDue as string[],
      accountType: account.type as 'standard' | 'express' | 'custom'
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
