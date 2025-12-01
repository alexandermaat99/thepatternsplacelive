import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';
import { deliverProductsForOrders } from '@/lib/product-delivery';

// Calculate fees for an order
function calculateFees(amount: number) {
  const platformFeePercent = COMPANY_INFO.fees.platformFeePercent;
  const stripePercent = COMPANY_INFO.fees.stripePercentFee;
  const stripeFlatFee = COMPANY_INFO.fees.stripeFlatFeeCents / 100;

  const platformFee = Math.round(amount * platformFeePercent * 100) / 100;
  const stripeFee = Math.round((amount * stripePercent + stripeFlatFee) * 100) / 100;
  const netAmount = Math.round((amount - platformFee - stripeFee) * 100) / 100;

  return { platformFee, stripeFee, netAmount };
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = await createClient();

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Check if order already exists for this session
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .limit(1);

    if (existingOrder && existingOrder.length > 0) {
      console.log('Order already exists for session:', session.id);
      return NextResponse.json({ success: true, message: 'Order already processed' });
    }

    // Get metadata from session
    const metadata = session.metadata || {};
    const cartItems = metadata.cartItems;

    console.log('Processing order for session:', session.id);
    console.log('Metadata:', metadata);

    if (cartItems) {
      // Cart checkout - create multiple orders
      try {
        const items = JSON.parse(cartItems);
        const productIds = items.map((item: { productId: string }) => item.productId);
        
        const { data: products } = await supabase
          .from('products')
          .select('id, user_id, price, currency')
          .in('id', productIds);

        if (products) {
          const orders = items
            .map((item: { productId: string; quantity: number }) => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;

              const orderAmount = product.price * item.quantity;
              const fees = calculateFees(orderAmount);

              return {
                product_id: item.productId,
                buyer_id: metadata.buyerId || null,
                seller_id: product.user_id,
                stripe_session_id: session.id,
                status: 'completed',
                amount: orderAmount,
                currency: product.currency || 'USD',
                buyer_email: metadata.buyerEmail || session.customer_email || null,
                platform_fee: fees.platformFee,
                stripe_fee: fees.stripeFee,
                net_amount: fees.netAmount,
              };
            })
            .filter(Boolean);

          if (orders.length > 0) {
            const { error: orderError, data: insertedOrders } = await supabase
              .from('orders')
              .insert(orders)
              .select();

            if (orderError) {
              console.error('Error creating cart orders:', orderError);
              return NextResponse.json({ error: 'Failed to create orders' }, { status: 500 });
            }
            
            if (insertedOrders) {
              console.log(`✅ Created ${insertedOrders.length} order(s) for session ${session.id}`);
              
              // Deliver products via email (non-blocking)
              deliverProductsForOrders(insertedOrders).catch(error => {
                console.error('❌ Error delivering products via email:', error);
              });
              
              return NextResponse.json({ 
                success: true, 
                ordersCreated: insertedOrders.length 
              });
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing cart items:', parseError);
        return NextResponse.json({ error: 'Failed to parse cart items' }, { status: 500 });
      }
    } else if (metadata.productId) {
      // Single product checkout
      const { data: product } = await supabase
        .from('products')
        .select('user_id, price, currency')
        .eq('id', metadata.productId)
        .single();

      if (product) {
        const orderAmount = session.amount_total ? session.amount_total / 100 : 0;
        const fees = calculateFees(orderAmount);

        const { error: orderError, data: insertedOrders } = await supabase
          .from('orders')
          .insert({
            product_id: metadata.productId,
            buyer_id: metadata.buyerId || null,
            seller_id: product.user_id,
            stripe_session_id: session.id,
            status: 'completed',
            amount: orderAmount,
            currency: session.currency?.toUpperCase() || 'USD',
            buyer_email: metadata.buyerEmail || session.customer_email || null,
            platform_fee: fees.platformFee,
            stripe_fee: fees.stripeFee,
            net_amount: fees.netAmount,
          })
          .select();

        if (orderError) {
          console.error('Error creating order:', orderError);
          return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }
        
        if (insertedOrders && insertedOrders.length > 0) {
          console.log(`✅ Created order ${insertedOrders[0].id} for session ${session.id}`);
          
          // Deliver product via email (non-blocking)
          deliverProductsForOrders(insertedOrders).catch(error => {
            console.error('❌ Error delivering product via email:', error);
          });
          
          return NextResponse.json({ 
            success: true, 
            ordersCreated: 1 
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'No products to process' 
    });
  } catch (error) {
    console.error('Process order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

