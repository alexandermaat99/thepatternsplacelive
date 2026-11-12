import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { summarizeConnectedAccount } from '@/lib/stripe-connect';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  // accountId is used in error-handling; keep it in outer scope
  let accountId: string | undefined;
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.STANDARD);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    accountId = body?.accountId;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Validate accountId format (Stripe account IDs start with acct_)
    if (typeof accountId !== 'string' || !accountId.startsWith('acct_')) {
      return NextResponse.json({ error: 'Invalid account ID format' }, { status: 400 });
    }

    // Verify the account belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.stripe_account_id !== accountId) {
      return NextResponse.json(
        { error: 'Unauthorized - account does not belong to user' },
        { status: 403 }
      );
    }

    // On localhost/test environments you may not have Stripe configured.
    // Don't hard-fail the whole request (which currently shows as a 500 and breaks client UI).
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        status: 'unknown',
        isOnboarded: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requiresMoreInfo: false,
        pendingVerification: false,
        requirementsDue: [],
        account: {
          id: accountId,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        },
      });
    }

    const stripe = getStripe();

    // Get the account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const summary = summarizeConnectedAccount(account);

    return NextResponse.json({
      ...summary,
      account: {
        id: account.id,
        details_submitted: summary.detailsSubmitted,
        charges_enabled: summary.chargesEnabled,
        payouts_enabled: summary.payoutsEnabled,
      },
    });
  } catch (error: any) {
    // Log full error server-side but don't expose details
    console.error('Error checking Stripe account:', error);

    // Common localhost/dev case:
    // - local uses a test key (sk_test_...)
    // - but the DB still contains a live account id (acct_...)
    // Stripe will throw StripePermissionError / account_invalid (403).
    // Treat this as a non-fatal "unknown" status so the UI doesn't break.
    if (
      error?.type === 'StripePermissionError' ||
      error?.code === 'account_invalid' ||
      error?.statusCode === 403
    ) {
      return NextResponse.json(
        {
          status: 'unknown',
          isOnboarded: false,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          requiresMoreInfo: false,
          pendingVerification: false,
          requirementsDue: [],
          account: {
            id: accountId,
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while checking account status' },
      { status: 500 }
    );
  }
}
