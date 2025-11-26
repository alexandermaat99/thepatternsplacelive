import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { formatAmountForStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get seller's profile with Stripe account ID
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', product.user_id)
      .single();

    if (sellerError || !sellerProfile) {
      return NextResponse.json(
        { error: 'Seller profile not found' },
        { status: 404 }
      );
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
        return NextResponse.json(
          { error: 'Seller account is not fully set up' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error retrieving seller account:', error);
      return NextResponse.json(
        { error: 'Invalid seller Stripe account' },
        { status: 400 }
      );
    }

    // Calculate platform fee (optional - set to 0 or a percentage)
    // For example, 5% platform fee: Math.round(product.price * 0.05 * 100)
    const platformFeeAmount = 0; // Change this to your desired platform fee

    // Create Stripe checkout session with Connect transfer
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
      payment_intent_data: {
        // Transfer payment to seller's Stripe Connect account
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        // Optional: Add platform fee (uncomment if you want to charge a fee)
        // application_fee_amount: platformFeeAmount,
      },
      success_url: `${request.nextUrl.origin}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/marketplace/product/${productId}`,
      metadata: {
        productId: product.id,
        buyerId: user.id,
        sellerId: product.user_id,
        sellerStripeAccountId: sellerStripeAccountId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 