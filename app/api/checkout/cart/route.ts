import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { formatAmountForStripe } from '@/lib/stripe';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';

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

    // Filter out free products - they should be handled separately
    const paidProducts = products.filter((p: any) => !p.is_free && p.price > 0);
    const freeProducts = products.filter((p: any) => p.is_free || p.price === 0);

    if (freeProducts.length > 0) {
      return NextResponse.json(
        {
          error:
            'Free products cannot be purchased through Stripe checkout. Please use the free checkout endpoint.',
        },
        { status: 400 }
      );
    }

    if (paidProducts.length === 0) {
      return NextResponse.json({ error: 'No paid products to checkout' }, { status: 400 });
    }

    // Get all unique seller IDs (from paid products only)
    const sellerIds = [...new Set(paidProducts.map((p: any) => p.user_id))];

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
    const productsWithoutStripe = paidProducts.filter((p: any) => !sellerStripeMap.get(p.user_id));
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

    // Build line items for Stripe (only paid products)
    const lineItems = items
      .filter((item: { productId: string; quantity: number }) => {
        const product = paidProducts.find((p: any) => p.id === item.productId);
        return product !== undefined;
      })
      .map((item: { productId: string; quantity: number }) => {
        const product = paidProducts.find((p: any) => p.id === item.productId);
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
              tax_code: 'txcd_10301000', // Digital products tax code (eBooks, digital files, etc.)
            },
            unit_amount: formatAmountForStripe(product.price, product.currency),
          },
          quantity: item.quantity,
        };
      });

    // Calculate total amount for platform fee (only paid products)
    const totalAmount = items.reduce(
      (sum: number, item: { productId: string; quantity: number }) => {
        const product = paidProducts.find((p: any) => p.id === item.productId);
        return sum + (product?.price || 0) * item.quantity;
      },
      0
    );

    // Calculate Etsy-style platform fees from centralized config (lib/company-info.ts)
    // TAX WITHHOLDING: As the tax-collecting entity, we must withhold tax from seller payouts
    // Seller receives: Sale Price - Platform Fee (tax is NOT included in seller payout)
    // Platform keeps: Platform Fee + Tax (for remittance)
    //
    // Etsy fee structure:
    // - Listing Fee: $0.20 per sale
    // - Transaction Fee: 6.5% of sale price
    // - Payment Processing: 3% + $0.25
    // Total: $0.20 + (sale_price * 0.065) + (sale_price * 0.03) + $0.25
    const totalInCents = Math.round(totalAmount * 100);

    // Calculate Etsy-style fees
    const fees = calculateEtsyFees(totalInCents);
    const platformFeeAmount = fees.totalFee;

    // Calculate seller payout: Total Sale Price - Platform Fee (tax excluded)
    // This ensures seller only gets their net from the sale, not the tax portion
    const sellerPayoutCents = totalInCents - platformFeeAmount;

    // Create Stripe checkout session with Connect transfer
    // Note: For multi-seller carts, consider splitting into separate sessions
    //
    // Tax handling (industry standard for marketplaces):
    // - Platform-level tax: Tax is calculated and collected by Stripe on the platform account
    // - Tax amount stays with platform for remittance to tax authorities
    // - Transfer to seller = product amount - platform fees (tax is separate)
    // - This is the standard model used by Etsy, Amazon, etc.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      automatic_tax: {
        enabled: true, // Platform-level tax calculation (industry standard)
      },
      payment_intent_data: {
        // Transfer payment to primary seller's Stripe Connect account
        // IMPORTANT: We set the transfer amount explicitly to exclude tax
        // Seller receives: Sale Price - Platform Fee (tax is withheld by platform)
        // For multi-seller carts, you may want to handle transfers in webhook
        transfer_data: {
          destination: primarySellerAccountId,
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
          ...(user?.id && { buyerId: user.id }),
          ...(user?.email && { buyerEmail: user.email }),
          cartItems: JSON.stringify(
            items.map((item: { productId: string; quantity: number }) => ({
              productId: item.productId,
              quantity: item.quantity,
            }))
          ),
          sellerAccountIds: JSON.stringify(sellerAccountIds),
          primarySellerAccountId: primarySellerAccountId,
        },
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
