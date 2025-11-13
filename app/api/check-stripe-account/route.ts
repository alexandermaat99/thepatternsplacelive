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
    
    // Check if the account is fully onboarded
    const isOnboarded = account.details_submitted && account.charges_enabled;
    
    console.log('Stripe account details:', {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      isOnboarded
    });
    
    return NextResponse.json({ 
      status: isOnboarded ? 'onboarded' : 'pending',
      account: {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
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
