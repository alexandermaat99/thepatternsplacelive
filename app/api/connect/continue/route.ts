import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  canReceiveSales,
  createHostedOnboardingLink,
  getOrCreateConnectedAccount,
} from '@/lib/stripe-connect';

/**
 * GET /api/connect/continue
 * Sends the seller to Stripe-hosted onboarding. Used as the fallback when the
 * embedded form can't load, and as the account link's refresh_url.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/auth/login`, 303);
    }

    const account = await getOrCreateConnectedAccount(supabase, user);

    if (canReceiveSales(account) && !account.requirements?.currently_due?.length) {
      return NextResponse.redirect(`${origin}/dashboard/stripe-setup`, 303);
    }

    const url = await createHostedOnboardingLink(account.id, origin);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error('Stripe continue setup error:', error);
    return NextResponse.redirect(`${origin}/dashboard/stripe-setup?error=1`, 303);
  }
}
