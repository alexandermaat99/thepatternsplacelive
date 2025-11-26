import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stripe = getStripe();

    // 1. Create a new Stripe Standard account for the seller (easier for testing)
    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'US', // Add country
      email: user.email, // Add email
      metadata: { userId },
      business_profile: {
        url: 'https://thepatternsplace.com', // Your marketplace URL
        mcc: '5999', // Miscellaneous retail stores
        product_description: 'Digital products and services sold through ThePatternsPlace marketplace'
      }
    });

    // 2. Save the account.id to the user's profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile. Make sure stripe_account_id column exists.' },
        { status: 500 }
      );
    }

    // 3. Create an onboarding link for Standard account
    const origin = request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/dashboard`,
      return_url: `${origin}/dashboard`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to start Stripe onboarding' },
      { status: 500 }
    );
  }
} 