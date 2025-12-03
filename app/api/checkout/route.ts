import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { formatAmountForStripe } from '@/lib/stripe';
import { COMPANY_INFO } from '@/lib/company-info';

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    const supabase = await createClient();

    // Get the current user (optional for guest checkout)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get the product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get seller's profile with Stripe account ID
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', product.user_id)
      .single();

    if (sellerError || !sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    // Get seller's Stripe account ID
    const sellerStripeAccountId = sellerProfile.stripe_account_id;

    if (!sellerStripeAccountId) {
      return NextResponse.json(
        { error: 'Seller has not connected their Stripe account' },
        { status: 400 }
      );
    }

    // Verify the seller's Stripe account is active
    const stripe = getStripe();
    let sellerAccount;
    try {
      sellerAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
      if (!sellerAccount.charges_enabled || !sellerAccount.details_submitted) {
        return NextResponse.json({ error: 'Seller account is not fully set up' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error retrieving seller account:', error);
      return NextResponse.json({ error: 'Invalid seller Stripe account' }, { status: 400 });
    }

    // Calculate platform fee from centralized config (lib/company-info.ts)
    const priceInCents = Math.round(product.price * 100);

    // Platform transaction fee (e.g., 6%)
    const platformFee = Math.round(priceInCents * COMPANY_INFO.fees.platformFeePercent);

    // Optionally pass Stripe's processing fees to the seller (like Etsy does)
    let stripeFeePassthrough = 0;
    if (COMPANY_INFO.fees.passStripeFeesToSeller) {
      // Estimate Stripe's fee: 2.9% + $0.30
      stripeFeePassthrough = Math.round(
        priceInCents * COMPANY_INFO.fees.stripePercentFee + COMPANY_INFO.fees.stripeFlatFeeCents
      );
    }

    // Total application fee = platform fee + stripe passthrough (if enabled)
    const totalFee = platformFee + stripeFeePassthrough;
    const platformFeeAmount = Math.max(totalFee, COMPANY_INFO.fees.minimumFeeCents);

    // Create Stripe checkout session with Connect transfer
    //
    // Tax handling (industry standard for marketplaces):
    // - Platform-level tax: Tax is calculated and collected by Stripe on the platform account
    // - Tax amount stays with platform for remittance to tax authorities
    // - Transfer to seller = product amount - platform fees (tax is separate)
    // - This is the standard model used by Etsy, Amazon, etc.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.title,
              description: product.description,
              images: product.image_url ? [product.image_url] : [],
            },
            unit_amount: formatAmountForStripe(product.price, product.currency),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      automatic_tax: {
        enabled: true, // Platform-level tax calculation (industry standard)
      },
      payment_intent_data: {
        // Transfer payment to seller's Stripe Connect account
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        // Platform fee - goes to The Pattern's Place
        ...(platformFeeAmount > 0 && { application_fee_amount: platformFeeAmount }),
        // Store metadata on PaymentIntent for webhook processing
        metadata: {
          productId: product.id,
          ...(user?.id && { buyerId: user.id }),
          ...(user?.email && { buyerEmail: user.email }),
          sellerId: product.user_id,
          sellerStripeAccountId: sellerStripeAccountId,
        },
      },
      success_url: `${request.nextUrl.origin}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/marketplace/product/${productId}`,
      customer_email: user?.email || undefined,
      metadata: {
        productId: product.id,
        ...(user?.id && { buyerId: user.id }),
        ...(user?.email && { buyerEmail: user.email }),
        sellerId: product.user_id,
        sellerStripeAccountId: sellerStripeAccountId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
