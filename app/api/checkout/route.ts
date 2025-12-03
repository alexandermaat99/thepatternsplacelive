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
    // TAX WITHHOLDING: As the tax-collecting entity, we must withhold tax from seller payouts
    // Seller receives: Sale Price - Platform Fee (tax is NOT included in seller payout)
    // Platform keeps: Platform Fee + Tax (for remittance)
    //
    // Example: $0.75 sale, $0.50 fee, $0.06 tax
    // - Customer pays: $0.81 total
    // - Seller receives: $0.75 - $0.50 = $0.25 (via transfer_data.amount)
    // - Platform keeps: $0.50 (fee) + $0.06 (tax) = $0.56 (via application_fee_amount)
    const priceInCents = Math.round(product.price * 100);

    // Platform transaction fee (percentage of subtotal)
    const platformFee = Math.round(priceInCents * COMPANY_INFO.fees.platformFeePercent);

    // Optionally pass Stripe's processing fees to the seller
    let stripeFeePassthrough = 0;
    if (COMPANY_INFO.fees.passStripeFeesToSeller === true) {
      // Pass both percentage and flat fee
      stripeFeePassthrough = Math.round(
        priceInCents * COMPANY_INFO.fees.stripePercentFee + COMPANY_INFO.fees.stripeFlatFeeCents
      );
    } else if (COMPANY_INFO.fees.passStripeFeesToSeller === 'flat-only') {
      // Only pass the flat fee, platform absorbs the percentage
      stripeFeePassthrough = COMPANY_INFO.fees.stripeFlatFeeCents;
    }
    // If false, stripeFeePassthrough remains 0 (platform absorbs all)

    // Total application fee = platform fee + stripe passthrough (if enabled)
    const totalFee = platformFee + stripeFeePassthrough;
    const platformFeeAmount = Math.max(totalFee, COMPANY_INFO.fees.minimumFeeCents);

    // Calculate seller payout: Sale Price - Platform Fee (tax excluded)
    // This ensures seller only gets their net from the sale, not the tax portion
    const sellerPayoutCents = priceInCents - platformFeeAmount;

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
              tax_code: 'txcd_10301000', // Digital products tax code (eBooks, digital files, etc.)
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
        // IMPORTANT: We set the transfer amount explicitly to exclude tax
        // Seller receives: Sale Price - Platform Fee (tax is withheld by platform)
        transfer_data: {
          destination: sellerStripeAccountId,
          // Set explicit amount to seller: Sale Price - Platform Fee
          // This ensures tax is NOT included in seller payout
          amount: sellerPayoutCents,
        },
        // Platform fee - this will be calculated as: Total - Transfer Amount
        // So if total is $0.81 and transfer is $0.25, fee = $0.56
        // This includes both platform fee ($0.50) and tax ($0.06) for remittance
        // Note: We don't set application_fee_amount when using transfer_data.amount
        // Stripe automatically calculates: application_fee = total - transfer_amount
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
