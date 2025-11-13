import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Check if this is a cart checkout (multiple products) or single product checkout
        const cartItems = session.metadata?.cartItems;
        
        if (cartItems) {
          // Cart checkout - create multiple orders
          try {
            const items = JSON.parse(cartItems);
            
            // Get product details to get seller_id for each product
            const productIds = items.map((item: { productId: string }) => item.productId);
            const { data: products } = await supabase
              .from('products')
              .select('id, user_id, price, currency')
              .in('id', productIds);
            
            if (products) {
              // Create an order for each product in the cart
              const orders = items.map((item: { productId: string; quantity: number }) => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;
                
                return {
                  product_id: item.productId,
                  buyer_id: session.metadata?.buyerId || null,
                  seller_id: product.user_id, // products.user_id is the profile id, which equals auth.users.id
                  stripe_session_id: session.id,
                  status: 'completed',
                  amount: product.price * item.quantity,
                  currency: product.currency || 'USD',
                  buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
                };
              }).filter(Boolean);
              
              if (orders.length > 0) {
                const { error: orderError } = await supabase
                  .from('orders')
                  .insert(orders);
                
                if (orderError) {
                  console.error('Error creating cart orders:', orderError);
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing cart items:', parseError);
          }
        } else {
          // Single product checkout (legacy)
          const { data: product } = await supabase
            .from('products')
            .select('user_id')
            .eq('id', session.metadata?.productId)
            .single();
          
          if (product) {
            const { error: orderError } = await supabase
              .from('orders')
              .insert({
                product_id: session.metadata?.productId,
                buyer_id: session.metadata?.buyerId || null,
                seller_id: product.user_id, // products.user_id is the profile id, which equals auth.users.id
                stripe_session_id: session.id,
                status: 'completed',
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency?.toUpperCase() || 'USD',
                buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
              });

            if (orderError) {
              console.error('Error creating order:', orderError);
            }
          }
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        
        // Update order status to expired
        const { error } = await supabase
          .from('orders')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id);

        if (error) {
          console.error('Error updating order status:', error);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 