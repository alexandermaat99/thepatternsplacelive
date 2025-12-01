import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    
    // Get the account details from Stripe
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
    let status: 'pending' | 'onboarded' | 'pending_verification' | 'requires_info';
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
    
    console.log('Stripe account details:', {
      id: account.id,
      details_submitted: detailsSubmitted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      isOnboarded,
      status,
      currentlyDue,
      pendingVerification
    });
    
    return NextResponse.json({ 
      status,
      isOnboarded,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      requiresMoreInfo,
      pendingVerification: isPendingVerification,
      requirementsDue: currentlyDue,
      account: {
        id: account.id,
        details_submitted: detailsSubmitted,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled
      }
    });
  } catch (error) {
    console.error('Error checking Stripe account:', error);
    return NextResponse.json(
      { error: 'Failed to check account status' },
      { status: 500 }
    );
  }
}
