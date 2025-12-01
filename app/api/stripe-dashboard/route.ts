import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe account ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const accountId = profile.stripe_account_id;

    try {
      // Try to get account info to check the type
      const account = await stripe.accounts.retrieve(accountId);
      
      // Check if this is an Express account (has controller or type is express)
      const isExpress = account.type === 'express';
      
      if (isExpress) {
        // Create a login link for Express accounts
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return NextResponse.json({ url: loginLink.url });
      } else {
        // For Standard or Custom accounts, redirect to main Stripe dashboard
        // They manage their account directly through stripe.com
        return NextResponse.json({ 
          url: 'https://dashboard.stripe.com/',
          message: 'Standard account - redirecting to main Stripe Dashboard'
        });
      }
    } catch (stripeError: any) {
      // If createLoginLink fails, provide fallback to main dashboard
      console.error('Stripe API error:', stripeError.message);
      
      if (stripeError.message?.includes('Express Dashboard')) {
        // Account doesn't have Express access, use main dashboard
        return NextResponse.json({ 
          url: 'https://dashboard.stripe.com/',
          message: 'Redirecting to main Stripe Dashboard'
        });
      }
      
      throw stripeError;
    }
  } catch (error) {
    console.error('Error creating Stripe dashboard link:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard link' },
      { status: 500 }
    );
  }
}

