import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { summarizeConnectedAccount } from '@/lib/stripe-connect';
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
    const account = await getStripe().accounts.retrieve(accountId);
    return { isConnected: true, accountId, ...summarizeConnectedAccount(account) };
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
