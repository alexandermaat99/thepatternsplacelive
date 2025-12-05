import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateUUID } from '@/lib/security/input-validation';

export async function POST(request: NextRequest) {
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

    const { accountId } = await request.json();

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
      pendingVerification,
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
        payouts_enabled: payoutsEnabled,
      },
    });
  } catch (error) {
    // Log full error server-side but don't expose details
    console.error('Error checking Stripe account:', error);
    return NextResponse.json(
      { error: 'An error occurred while checking account status' },
      { status: 500 }
    );
  }
}
