import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { formatAmountForStripe } from '@/lib/stripe';
import { COMPANY_INFO } from '@/lib/company-info';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json(); // items: [{ productId, quantity }] - quantity always 1 for digital products

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user (optional for guest checkout)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get all product details
    const productIds = items.map((item: { productId: string }) => item.productId);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true);

    if (productError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Products not found' }, { status: 404 });
    }

    // Verify all requested products exist
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products are no longer available' }, { status: 400 });
    }

    // Get all unique seller IDs
    const sellerIds = [...new Set(products.map((p: any) => p.user_id))];

    // Get seller profiles with Stripe account IDs
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id')
      .in('id', sellerIds);

    if (sellerError || !sellerProfiles) {
      return NextResponse.json({ error: 'Error fetching seller information' }, { status: 500 });
    }

    // Create a map of seller ID to Stripe account ID
    const sellerStripeMap = new Map(sellerProfiles.map((p: any) => [p.id, p.stripe_account_id]));

    // Check that all products have sellers with connected Stripe accounts
    const productsWithoutStripe = products.filter((p: any) => !sellerStripeMap.get(p.user_id));
    if (productsWithoutStripe.length > 0) {
      return NextResponse.json(
        { error: 'Some sellers have not connected their Stripe accounts' },
        { status: 400 }
      );
    }

    // Verify all seller Stripe accounts are active
    const stripe = getStripe();
    const uniqueSellerAccounts = new Set(
      products.map((p: any) => sellerStripeMap.get(p.user_id)).filter(Boolean)
    );

    // Check all seller accounts
    for (const accountId of uniqueSellerAccounts) {
      try {
        const account = await stripe.accounts.retrieve(accountId);
        if (!account.charges_enabled || !account.details_submitted) {
          return NextResponse.json(
            { error: 'One or more seller accounts are not fully set up' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error retrieving seller account:', error);
        return NextResponse.json({ error: 'Invalid seller Stripe account' }, { status: 400 });
      }
    }

    // For cart checkout with multiple sellers, we need to handle it differently
    // Stripe Checkout doesn't support per-line-item transfers, so we have two options:
    // 1. Only allow single-seller carts (simpler)
    // 2. Create separate checkout sessions per seller (more complex)
    // For now, we'll allow multi-seller carts but transfer to the first seller
    // In production, you might want to split into multiple sessions or use Payment Intents

    const sellerAccountIds = Array.from(uniqueSellerAccounts);
    const primarySellerAccountId = sellerAccountIds[0];

    // If multiple sellers, warn but proceed with first seller
    // TODO: Consider splitting into multiple checkout sessions for better UX
    if (sellerAccountIds.length > 1) {
      console.warn(
        `Cart contains products from ${sellerAccountIds.length} different sellers. Using first seller for transfer.`
      );
    }

    // Build line items for Stripe
    const lineItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      return {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: {
            name: product.title,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : [],
          },
          unit_amount: formatAmountForStripe(product.price, product.currency),
        },
        quantity: item.quantity,
      };
    });

    // Calculate total amount for platform fee
    const totalAmount = items.reduce(
      (sum: number, item: { productId: string; quantity: number }) => {
        const product = products.find((p: any) => p.id === item.productId);
        return sum + (product?.price || 0) * item.quantity;
      },
      0
    );

    // Calculate platform fee from centralized config (lib/company-info.ts)
    const totalInCents = Math.round(totalAmount * 100);

    // Platform transaction fee (e.g., 6%)
    const platformFee = Math.round(totalInCents * COMPANY_INFO.fees.platformFeePercent);

    // Optionally pass Stripe's processing fees to the seller (like Etsy does)
    let stripeFeePassthrough = 0;
    if (COMPANY_INFO.fees.passStripeFeesToSeller) {
      // Estimate Stripe's fee: 2.9% + $0.30
      stripeFeePassthrough = Math.round(
        totalInCents * COMPANY_INFO.fees.stripePercentFee + COMPANY_INFO.fees.stripeFlatFeeCents
      );
    }

    // Total application fee = platform fee + stripe passthrough (if enabled)
    const totalFee = platformFee + stripeFeePassthrough;
    const platformFeeAmount = Math.max(totalFee, COMPANY_INFO.fees.minimumFeeCents);

    // Create Stripe checkout session with Connect transfer
    // Note: For multi-seller carts, consider splitting into separate sessions
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        // Transfer payment to primary seller's Stripe Connect account
        // For multi-seller carts, you may want to handle transfers in webhook
        transfer_data: {
          destination: primarySellerAccountId,
        },
        // Platform fee - goes to The Pattern's Place
        ...(platformFeeAmount > 0 && { application_fee_amount: platformFeeAmount }),
      },
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/cart`,
      customer_email: user?.email || undefined,
      metadata: {
        ...(user?.id && { buyerId: user.id }),
        ...(user?.email && { buyerEmail: user.email }),
        // Store cart items as JSON in metadata (we'll parse this in webhook)
        cartItems: JSON.stringify(
          items.map((item: { productId: string; quantity: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        ),
        // Store seller account IDs for webhook processing
        sellerAccountIds: JSON.stringify(sellerAccountIds),
        primarySellerAccountId: primarySellerAccountId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Cart checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
