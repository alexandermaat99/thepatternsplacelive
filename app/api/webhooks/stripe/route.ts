import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { deliverProductsForOrders } from '@/lib/product-delivery';
import { COMPANY_INFO } from '@/lib/company-info';

// Calculate fees for an order (matches checkout calculation)
function calculateFees(amount: number) {
  // Convert to cents for calculation
  const amountInCents = Math.round(amount * 100);
  
  // Platform transaction fee
  const platformFeeCents = Math.round(amountInCents * COMPANY_INFO.fees.platformFeePercent);
  
  // Stripe fee passthrough (if enabled)
  let stripeFeePassthroughCents = 0;
  if (COMPANY_INFO.fees.passStripeFeesToSeller) {
    stripeFeePassthroughCents = Math.round(
      amountInCents * COMPANY_INFO.fees.stripePercentFee + COMPANY_INFO.fees.stripeFlatFeeCents
    );
  }
  
  // Total application fee (what we actually take from Stripe)
  const totalFeeCents = platformFeeCents + stripeFeePassthroughCents;
  const applicationFeeCents = Math.max(totalFeeCents, COMPANY_INFO.fees.minimumFeeCents);
  
  // Convert back to dollars
  const applicationFee = applicationFeeCents / 100;
  const netAmount = (amountInCents - applicationFeeCents) / 100;
  
  // For database storage, break down the application fee
  // The application fee includes both platform fee and stripe passthrough
  const platformFee = platformFeeCents / 100;
  const stripeFee = stripeFeePassthroughCents / 100;
  
  return { 
    platformFee, 
    stripeFee, 
    netAmount,
    applicationFee // Total fee actually charged
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  console.log('🔔 Webhook received:', event.type);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('✅ Processing checkout.session.completed:', session.id);

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
              const orders = items
                .map((item: { productId: string; quantity: number }) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;

                  const orderAmount = product.price * item.quantity;
                  const fees = calculateFees(orderAmount);

                  return {
                    product_id: item.productId,
                    buyer_id: session.metadata?.buyerId || null,
                    seller_id: product.user_id,
                    stripe_session_id: session.id,
                    status: 'completed',
                    amount: orderAmount,
                    currency: product.currency || 'USD',
                    buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
                    platform_fee: fees.platformFee,
                    stripe_fee: fees.stripeFee,
                    net_amount: fees.netAmount,
                  };
                })
                .filter(Boolean);

              if (orders.length > 0) {
                // Check for duplicates before inserting
                const sessionIds = orders.map(o => o.stripe_session_id);
                const { data: existingOrders } = await supabase
                  .from('orders')
                  .select('stripe_session_id')
                  .in('stripe_session_id', sessionIds);

                if (existingOrders && existingOrders.length > 0) {
                  console.log('⏭️ Orders already exist for this session, skipping duplicate creation');
                  break;
                }

                const { error: orderError, data: insertedOrders } = await supabase
                  .from('orders')
                  .insert(orders)
                  .select();

                if (orderError) {
                  console.error('Error creating cart orders:', orderError);
                } else if (insertedOrders) {
                  console.log(
                    `✅ Created ${insertedOrders.length} order(s) for session ${session.id}`
                  );
                  console.log(
                    'Orders:',
                    insertedOrders.map(o => ({
                      id: o.id,
                      product_id: o.product_id,
                      buyer_email: o.buyer_email,
                    }))
                  );

                  // Deliver products via email (non-blocking)
                  deliverProductsForOrders(insertedOrders).catch(error => {
                    console.error('❌ Error delivering products via email:', error);
                    // Don't throw - email delivery failures shouldn't fail the webhook
                  });
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
            const orderAmount = session.amount_total ? session.amount_total / 100 : 0;
            const fees = calculateFees(orderAmount);

            const { error: orderError, data: insertedOrders } = await supabase
              .from('orders')
              .insert({
                product_id: session.metadata?.productId,
                buyer_id: session.metadata?.buyerId || null,
                seller_id: product.user_id,
                stripe_session_id: session.id,
                status: 'completed',
                amount: orderAmount,
                currency: session.currency?.toUpperCase() || 'USD',
                buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
                platform_fee: fees.platformFee,
                stripe_fee: fees.stripeFee,
                net_amount: fees.netAmount,
              })
              .select();

            if (orderError) {
              console.error('Error creating order:', orderError);
            } else if (insertedOrders && insertedOrders.length > 0) {
              console.log(`✅ Created order ${insertedOrders[0].id} for session ${session.id}`);
              console.log('Order details:', {
                id: insertedOrders[0].id,
                product_id: insertedOrders[0].product_id,
                buyer_email: insertedOrders[0].buyer_email,
              });

              // Deliver product via email (non-blocking)
              deliverProductsForOrders(insertedOrders).catch(error => {
                console.error('❌ Error delivering product via email:', error);
                // Don't throw - email delivery failures shouldn't fail the webhook
              });
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

      // Handle charge.succeeded for Connect payments (backup for checkout.session.completed)
      case 'charge.succeeded': {
        const charge = event.data.object;
        console.log('💳 Processing charge.succeeded:', charge.id);
        
        // Get metadata from payment intent
        const metadata = charge.metadata || {};
        
        // Skip if no metadata (not our checkout)
        if (!metadata.cartItems && !metadata.productId) {
          console.log('⏭️ Skipping charge.succeeded - no relevant metadata');
          break;
        }

        // Check if order already exists (from checkout.session.completed)
        // Check by charge ID first, then by payment intent
        const { data: existingOrderByCharge } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_session_id', charge.id)
          .limit(1);
        
        if (existingOrderByCharge && existingOrderByCharge.length > 0) {
          console.log('⏭️ Order already exists for this charge');
          break;
        }

        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;
        
        if (paymentIntentId) {
          // Also check by payment intent ID (in case session ID was used)
          const { data: existingOrderByPI } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_session_id', paymentIntentId)
            .limit(1);
          
          if (existingOrderByPI && existingOrderByPI.length > 0) {
            console.log('⏭️ Order already exists for this payment intent');
            break;
          }
        }

        // Cart checkout
        if (metadata.cartItems) {
          try {
            const items = JSON.parse(metadata.cartItems);
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
                    stripe_session_id: paymentIntentId || charge.id,
                    status: 'completed',
                    amount: orderAmount,
                    currency: product.currency || 'USD',
                    buyer_email: metadata.buyerEmail || charge.billing_details?.email || null,
                    platform_fee: fees.platformFee,
                    stripe_fee: fees.stripeFee,
                    net_amount: fees.netAmount,
                  };
                })
                .filter(Boolean);

              if (orders.length > 0) {
                // Check for duplicates before inserting
                const sessionIds = orders.map(o => o.stripe_session_id);
                const { data: existingOrders } = await supabase
                  .from('orders')
                  .select('stripe_session_id')
                  .in('stripe_session_id', sessionIds);

                if (existingOrders && existingOrders.length > 0) {
                  console.log('⏭️ Orders already exist for these sessions, skipping duplicate creation');
                  break;
                }

                const { error: orderError, data: insertedOrders } = await supabase
                  .from('orders')
                  .insert(orders)
                  .select();

                if (orderError) {
                  console.error('Error creating cart orders from charge:', orderError);
                } else if (insertedOrders) {
                  console.log(`✅ Created ${insertedOrders.length} order(s) from charge ${charge.id}`);
                  
                  deliverProductsForOrders(insertedOrders).catch(error => {
                    console.error('❌ Error delivering products via email:', error);
                  });
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing cart items from charge:', parseError);
          }
        }
        // Single product checkout
        else if (metadata.productId) {
          const { data: product } = await supabase
            .from('products')
            .select('user_id, price, currency')
            .eq('id', metadata.productId)
            .single();

          if (product) {
            const orderAmount = charge.amount / 100;
            const fees = calculateFees(orderAmount);

            const { error: orderError, data: insertedOrders } = await supabase
              .from('orders')
              .insert({
                product_id: metadata.productId,
                buyer_id: metadata.buyerId || null,
                seller_id: product.user_id,
                stripe_session_id: paymentIntentId || charge.id,
                status: 'completed',
                amount: orderAmount,
                currency: (charge.currency || 'usd').toUpperCase(),
                buyer_email: metadata.buyerEmail || charge.billing_details?.email || null,
                platform_fee: fees.platformFee,
                stripe_fee: fees.stripeFee,
                net_amount: fees.netAmount,
              })
              .select();

            if (orderError) {
              console.error('Error creating order from charge:', orderError);
            } else if (insertedOrders && insertedOrders.length > 0) {
              console.log(`✅ Created order ${insertedOrders[0].id} from charge ${charge.id}`);
              
              deliverProductsForOrders(insertedOrders).catch(error => {
                console.error('❌ Error delivering product via email:', error);
              });
            }
          }
        }

        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`, JSON.stringify(event.data.object, null, 2).substring(0, 500));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
