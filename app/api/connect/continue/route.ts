import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and owns this account
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the account belongs to this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.stripe_account_id !== accountId) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to user' },
        { status: 403 }
      );
    }

    const stripe = getStripe();

    // Check if account is already fully onboarded
    const account = await stripe.accounts.retrieve(accountId);
    
    if (account.details_submitted && account.charges_enabled) {
      return NextResponse.json(
        { error: 'Account is already fully set up', alreadyOnboarded: true },
        { status: 400 }
      );
    }

    // Create a new onboarding link for the existing account
    const origin = request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe_refresh=true`,
      return_url: `${origin}/dashboard?stripe_return=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe continue setup error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message || 'Invalid account' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to continue Stripe setup' },
      { status: 500 }
    );
  }
}

