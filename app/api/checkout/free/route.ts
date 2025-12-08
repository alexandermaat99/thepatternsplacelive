import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { deliverProductToCustomer } from '@/lib/product-delivery';
import { awardPointsForFreeDownload, awardPointsForFreeSale } from '@/lib/pattern-points';

export async function POST(request: NextRequest) {
  try {
    const { productId, email: guestEmail } = await request.json();

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

    // Verify the product is actually free
    if (!product.is_free && product.price !== 0) {
      return NextResponse.json(
        { error: 'This product is not free. Please use the regular checkout.' },
        { status: 400 }
      );
    }

    // Get buyer email (required for free products too)
    let buyerEmail: string;
    if (user?.email) {
      buyerEmail = user.email;
    } else if (guestEmail && typeof guestEmail === 'string' && guestEmail.includes('@')) {
      // Guest checkout with email provided
      buyerEmail = guestEmail.trim();
    } else {
      return NextResponse.json(
        { error: 'Please sign in or provide an email address to download free patterns' },
        { status: 400 }
      );
    }

    // Use service role client to create order (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient();

    // Create order directly (no Stripe session needed)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        product_id: product.id,
        buyer_id: user?.id || null, // null for guest buyers
        buyer_email: buyerEmail,
        seller_id: product.user_id,
        stripe_session_id: null, // No Stripe session for free products
        status: 'completed', // Free products are immediately completed
        amount: 0,
        currency: product.currency || 'USD',
        platform_fee: 0,
        stripe_fee: 0,
        net_amount: 0,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating free order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Deliver product via email (non-blocking)
    deliverProductToCustomer(order, product, buyerEmail).catch(error => {
      console.error('Error delivering free product:', error);
      // Don't fail the request if delivery fails - order is already created
    });

    // Award pattern points (non-blocking)
    (async () => {
      try {
        // Award points to buyer for downloading free pattern
        if (user?.id) {
          await awardPointsForFreeDownload(user.id);
        }

        // Award points to seller for free pattern download
        await awardPointsForFreeSale(product.user_id);
      } catch (error) {
        console.error('Error awarding pattern points for free product:', error);
        // Don't throw - points are non-critical
      }
    })();

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'Free pattern downloaded successfully',
    });
  } catch (error) {
    console.error('Free checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
