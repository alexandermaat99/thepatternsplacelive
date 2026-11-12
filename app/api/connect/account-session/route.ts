import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateConnectedAccount } from '@/lib/stripe-connect';

/**
 * Creates an Account Session for the embedded Stripe onboarding form.
 * Creates the seller's connected account on first use.
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

    const account = await getOrCreateConnectedAccount(supabase, user);

    const accountSession = await getStripe().accountSessions.create({
      account: account.id,
      components: {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true },
        },
      },
    });

    return NextResponse.json({ clientSecret: accountSession.client_secret });
  } catch (error: any) {
    console.error('Error creating account session:', error);
    return NextResponse.json({ error: 'Failed to start payout setup' }, { status: 500 });
  }
}
