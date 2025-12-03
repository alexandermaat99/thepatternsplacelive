import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { sendPurchaseEmail } from '@/lib/send-purchase-email';
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

  // For database storage:
  // - platform_fee: The actual application fee charged (platform fee only, since we absorb Stripe fees)
  // - stripe_fee: 0 (platform absorbs Stripe fees, not passed to seller)
  // - net_amount: What seller actually receives
  const platformFee = applicationFeeCents / 100; // Platform fee only (we absorb Stripe fees)
  const stripeFee = 0; // Platform absorbs Stripe fees, so this is always 0

  return {
    platformFee, // Platform fee only ($0.50 minimum) - Stripe fees absorbed by platform
    stripeFee, // Always 0 - platform absorbs Stripe fees
    netAmount, // Seller's net (amount - platform fee)
    applicationFee, // Same as platformFee (for reference)
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

        // Check if orders already exist for this session (prevent duplicates)
        const { data: existingSessionOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_session_id', session.id)
          .limit(1);

        if (existingSessionOrders && existingSessionOrders.length > 0) {
          console.log('⏭️ Orders already exist for session', session.id, '- skipping duplicate');
          break;
        }

        // Check if this is a cart checkout (multiple products) or single product checkout
        const cartItems = session.metadata?.cartItems;

        if (cartItems) {
          // Cart checkout - create multiple orders
          try {
            const items = JSON.parse(cartItems);

            // Get product details to get seller_id for each product (include files for email delivery)
            const productIds = items.map((item: { productId: string }) => item.productId);
            const { data: products } = await supabase
              .from('products')
              .select('id, user_id, price, currency, title, description, files')
              .in('id', productIds);

            if (products) {
              // Calculate tax allocation for cart checkout
              // session.amount_total includes tax, session.amount_subtotal is pre-tax
              const sessionSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : 0;
              const sessionTotal = session.amount_total ? session.amount_total / 100 : 0;
              const taxRate =
                sessionSubtotal > 0 ? (sessionTotal - sessionSubtotal) / sessionSubtotal : 0;

              // Calculate total subtotal for all items
              const totalSubtotal = items.reduce(
                (sum: number, item: { productId: string; quantity: number }) => {
                  const product = products.find(p => p.id === item.productId);
                  return sum + (product?.price || 0) * item.quantity;
                },
                0
              );

              // Create an order for each product in the cart
              const orders = items
                .map((item: { productId: string; quantity: number }) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;

                  const orderAmount = product.price * item.quantity;
                  // Allocate tax proportionally based on item's share of subtotal
                  const orderTotalAmount =
                    totalSubtotal > 0 ? orderAmount * (1 + taxRate) : orderAmount; // Fallback if no subtotal
                  const fees = calculateFees(orderAmount);

                  return {
                    product_id: item.productId,
                    buyer_id: session.metadata?.buyerId || null,
                    seller_id: product.user_id,
                    stripe_session_id: session.id,
                    status: 'completed',
                    amount: orderAmount,
                    total_amount: orderTotalAmount,
                    currency: product.currency || 'USD',
                    buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
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
                } else if (insertedOrders) {
                  console.log(
                    `✅ Created ${insertedOrders.length} order(s) for session ${session.id}`
                  );
                  console.log(
                    'Orders:',
                    insertedOrders.map(o => ({
                      id: o.id,
                      product_id: o.product_id,
                      buyer_email: o.buyer_email || 'MISSING',
                      buyer_id: o.buyer_id || 'N/A',
                    }))
                  );

                  // Verify buyer_email is set, and update if missing
                  const ordersWithoutEmail = insertedOrders.filter(o => !o.buyer_email);
                  if (ordersWithoutEmail.length > 0) {
                    console.error(
                      '❌ WARNING: Some orders have no buyer_email! Attempting to fix...'
                    );
                    console.error('Session customer_email:', session.customer_email);
                    console.error('Session metadata:', session.metadata);

                    // Try to update orders with customer_email from session if available
                    if (session.customer_email) {
                      console.log(
                        `🔧 Updating ${ordersWithoutEmail.length} order(s) with customer_email from session...`
                      );
                      const orderIdsToUpdate = ordersWithoutEmail.map(o => o.id);
                      const { error: updateError } = await supabase
                        .from('orders')
                        .update({ buyer_email: session.customer_email })
                        .in('id', orderIdsToUpdate);

                      if (updateError) {
                        console.error(
                          '❌ Failed to update orders with customer_email:',
                          updateError
                        );
                      } else {
                        console.log('✅ Successfully updated orders with customer_email');
                        // Update the local array so delivery can proceed
                        insertedOrders.forEach(order => {
                          if (!order.buyer_email) {
                            order.buyer_email = session.customer_email;
                          }
                        });
                      }
                    } else {
                      console.error(
                        '❌ Session has no customer_email either! Email delivery will fail.'
                      );
                    }
                  }

                  // Send purchase emails synchronously (industry standard - same as test-email pattern)
                  console.log('📧 Sending purchase emails...');

                  // Products already fetched above with files included
                  for (const order of insertedOrders) {
                    const product = products.find(p => p.id === order.product_id);
                    if (!product || !product.files || product.files.length === 0) {
                      console.log(`⏭️ Skipping email for order ${order.id} - no files`);
                      continue;
                    }

                    if (!order.buyer_email) {
                      console.error(`❌ Skipping email for order ${order.id} - no buyer email`);
                      continue;
                    }

                    // Get seller name
                    let sellerName: string | undefined;
                    const { data: sellerProfile } = await supabase
                      .from('profiles')
                      .select('full_name, username')
                      .eq('id', product.user_id)
                      .single();
                    sellerName = sellerProfile?.full_name || sellerProfile?.username;

                    // Get buyer name
                    let buyerName: string | undefined;
                    if (order.buyer_id) {
                      const { data: buyerProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', order.buyer_id)
                        .single();
                      buyerName = buyerProfile?.full_name;
                    }

                    // Send email synchronously
                    const emailResult = await sendPurchaseEmail({
                      orderId: order.id,
                      buyerEmail: order.buyer_email,
                      buyerName,
                      productId: product.id,
                      productTitle: product.title || 'Product',
                      productDescription: product.description || undefined,
                      sellerId: product.user_id,
                      sellerName,
                      filePaths: product.files,
                    });

                    if (emailResult.success) {
                      console.log(`✅ Email sent for order ${order.id} to ${order.buyer_email}`);
                    } else {
                      console.error(
                        `❌ Failed to send email for order ${order.id}:`,
                        emailResult.error
                      );
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing cart items:', parseError);
          }
        } else {
          // Single product checkout
          const { data: product } = await supabase
            .from('products')
            .select('id, user_id, title, description, files')
            .eq('id', session.metadata?.productId)
            .single();

          if (product) {
            // For single product checkout, use amount_subtotal for fee calculations (pre-tax)
            // and amount_total for total_amount (includes tax, matches Stripe dashboard)
            const orderSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : 0;
            const orderTotal = session.amount_total ? session.amount_total / 100 : 0;
            // Use subtotal for fee calculations (fees calculated on pre-tax amount)
            // If subtotal is not available, use total as fallback (for backwards compatibility)
            const amountForFees = orderSubtotal > 0 ? orderSubtotal : orderTotal;
            const fees = calculateFees(amountForFees);

            const { error: orderError, data: insertedOrders } = await supabase
              .from('orders')
              .insert({
                product_id: session.metadata?.productId,
                buyer_id: session.metadata?.buyerId || null,
                seller_id: product.user_id,
                stripe_session_id: session.id,
                status: 'completed',
                amount: amountForFees, // Subtotal for fee calculations (pre-tax)
                total_amount: orderTotal, // Total including tax (matches Stripe dashboard)
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
                buyer_email: insertedOrders[0].buyer_email || 'MISSING',
                buyer_id: insertedOrders[0].buyer_id || 'N/A',
              });

              // Verify buyer_email is set, and update if missing
              if (!insertedOrders[0].buyer_email) {
                console.error('❌ WARNING: Order has no buyer_email! Attempting to fix...');
                console.error('Session customer_email:', session.customer_email);
                console.error('Session metadata:', session.metadata);

                // Try to update order with customer_email from session if available
                if (session.customer_email) {
                  console.log('🔧 Updating order with customer_email from session...');
                  const { error: updateError } = await supabase
                    .from('orders')
                    .update({ buyer_email: session.customer_email })
                    .eq('id', insertedOrders[0].id);

                  if (updateError) {
                    console.error('❌ Failed to update order with customer_email:', updateError);
                  } else {
                    console.log('✅ Successfully updated order with customer_email');
                    insertedOrders[0].buyer_email = session.customer_email;
                  }
                } else {
                  console.error(
                    '❌ Session has no customer_email either! Email delivery will fail.'
                  );
                }
              }

              // Send purchase email synchronously (same pattern as test-email)
              if (
                product &&
                product.files &&
                product.files.length > 0 &&
                insertedOrders[0].buyer_email
              ) {
                console.log('📧 Sending purchase email...');

                // Get seller name
                let sellerName: string | undefined;
                const { data: sellerProfile } = await supabase
                  .from('profiles')
                  .select('full_name, username')
                  .eq('id', product.user_id)
                  .single();
                sellerName = sellerProfile?.full_name || sellerProfile?.username;

                // Get buyer name
                let buyerName: string | undefined;
                if (insertedOrders[0].buyer_id) {
                  const { data: buyerProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', insertedOrders[0].buyer_id)
                    .single();
                  buyerName = buyerProfile?.full_name;
                }

                const emailResult = await sendPurchaseEmail({
                  orderId: insertedOrders[0].id,
                  buyerEmail: insertedOrders[0].buyer_email,
                  buyerName,
                  productId: product.id,
                  productTitle: product.title || 'Product',
                  productDescription: product.description || undefined,
                  sellerId: product.user_id,
                  sellerName,
                  filePaths: product.files,
                });

                if (emailResult.success) {
                  console.log(`✅ Email sent to ${insertedOrders[0].buyer_email}`);
                } else {
                  console.error(`❌ Failed to send email:`, emailResult.error);
                }
              } else {
                console.log('⏭️ Skipping email - no files or no buyer email');
              }
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
      // NOTE: We use checkout.session.completed as primary, so this is just a backup
      // Skip this entirely to prevent duplicates - checkout.session.completed handles everything
      case 'charge.succeeded': {
        console.log(
          '💳 charge.succeeded received, but skipping - handled by checkout.session.completed'
        );
        // Skip entirely - checkout.session.completed is our primary handler
        // This prevents duplicate order creation
        break;
      }

      default:
        console.log(
          `⚠️ Unhandled event type: ${event.type}`,
          JSON.stringify(event.data.object, null, 2).substring(0, 500)
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
