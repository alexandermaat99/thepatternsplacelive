import { NextResponse } from 'next/server';
import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';

/**
 * GET /api/can-sell
 * Returns whether the current user can list paid patterns (has an approved Stripe account).
 * Used on submit when editing a product to paid, or when showing sell UI.
 */
export async function GET() {
  try {
    const authData = await getCurrentUserWithProfileServer();
    if (!authData?.user) {
      return NextResponse.json({ canSell: false }, { status: 200 });
    }

    const { profile } = authData;
    const stripeStatus = await getStripeAccountStatusServer(profile?.stripe_account_id ?? null);

    return NextResponse.json({ canSell: stripeStatus.isOnboarded });
  } catch (error) {
    console.error('Error checking can-sell:', error);
    return NextResponse.json({ canSell: false }, { status: 200 });
  }
}
