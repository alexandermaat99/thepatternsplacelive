import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns a URL to the seller's Stripe dashboard: a one-time login link for
 * Express accounts, or the regular Stripe dashboard for legacy Standard accounts.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: 'Payouts are not set up yet' }, { status: 400 });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    if (account.type === 'standard') {
      return NextResponse.json({ url: 'https://dashboard.stripe.com/' });
    }

    if (!account.details_submitted) {
      return NextResponse.json({ error: 'Finish payout setup first' }, { status: 400 });
    }

    const loginLink = await stripe.accounts.createLoginLink(account.id);
    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error('Error creating Stripe dashboard link:', error);
    return NextResponse.json({ error: 'Failed to create dashboard link' }, { status: 500 });
  }
}
