import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { calculateEtsyFees } from '@/lib/company-info';
import { deliverProductsForOrders } from '@/lib/product-delivery';
import { sendSellerSaleNotificationEmail } from '@/lib/email';
import { awardPointsForPurchase, awardPointsForSale } from '@/lib/pattern-points';

// Calculate fees for an order using Etsy-style structure
function calculateFees(amount: number) {
  const amountInCents = Math.round(amount * 100);
  const fees = calculateEtsyFees(amountInCents);

  // Convert back to dollars for return value
  const platformFee = fees.totalFee / 100;
  const stripeFee = 0; // Payment processing is included in total fee
  const netAmount = Math.round((amount - platformFee) * 100) / 100;

  return { platformFee, stripeFee, netAmount };
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const stripe = getStripe();
    // Use service role client to bypass RLS for order processing
    // This route processes orders from Stripe webhooks without user context
    const supabase = createServiceRoleClient();

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
              console.log(
                'Orders created:',
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
                console.error('❌ WARNING: Some orders have no buyer_email! Attempting to fix...');
                console.error('Session customer_email:', session.customer_email);
                console.error('Session metadata:', metadata);

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
                    console.error('❌ Failed to update orders with customer_email:', updateError);
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

              // Deliver products via email (non-blocking)
              console.log('📧 Triggering email delivery for orders from process-order route...');
              deliverProductsForOrders(insertedOrders).catch(error => {
                console.error('❌ FATAL ERROR in email delivery:', error);
                console.error(
                  'Error stack:',
                  error instanceof Error ? error.stack : 'No stack trace'
                );
              });

              // Award pattern points (non-blocking)
              // Award points per item: 10 points per product purchased
              (async () => {
                try {
                  const uniqueSellers = new Set<string>();

                  for (const order of insertedOrders) {
                    // Award points to buyer for each item purchased (if authenticated)
                    if (order.buyer_id) {
                      await awardPointsForPurchase(order.buyer_id);
                    }

                    // Award points to seller (once per seller, not per item)
                    if (order.seller_id && !uniqueSellers.has(order.seller_id)) {
                      uniqueSellers.add(order.seller_id);
                      await awardPointsForSale(order.seller_id);
                    }
                  }
                } catch (error) {
                  console.error('Error awarding pattern points:', error);
                  // Don't throw - points are non-critical
                }
              })();

              // Send seller notification emails (non-blocking)
              (async () => {
                try {
                  console.log('📧 Sending seller notification emails...');
                  const supabaseAdmin = createServiceRoleClient();
                  const sellerNotifications = new Map<
                    string,
                    { orders: typeof insertedOrders; product: any }
                  >();

                  // Get products with titles for notifications
                  const { data: productsWithTitles } = await supabase
                    .from('products')
                    .select('id, user_id, title')
                    .in('id', productIds);

                  // Group orders by seller
                  for (const order of insertedOrders) {
                    const product = productsWithTitles?.find(p => p.id === order.product_id);
                    if (!product) continue;

                    if (!sellerNotifications.has(product.user_id)) {
                      sellerNotifications.set(product.user_id, { orders: [], product });
                    }
                    sellerNotifications.get(product.user_id)!.orders.push(order);
                  }

                  // Send notification for each seller
                  for (const [
                    sellerId,
                    { orders: sellerOrders, product },
                  ] of sellerNotifications.entries()) {
                    try {
                      // Get seller email from auth.users
                      const { data: sellerUser, error: sellerUserError } =
                        await supabaseAdmin.auth.admin.getUserById(sellerId);

                      if (sellerUserError || !sellerUser?.user?.email) {
                        console.error(
                          `❌ Could not get seller email for ${sellerId}:`,
                          sellerUserError
                        );
                        continue;
                      }

                      // Get seller profile for name
                      const { data: sellerProfile } = await supabase
                        .from('profiles')
                        .select('full_name, username')
                        .eq('id', sellerId)
                        .single();
                      const sellerName = sellerProfile?.full_name || sellerProfile?.username;

                      // Get buyer info for first order
                      let buyerName: string | undefined;
                      let buyerEmail: string | undefined;
                      if (sellerOrders[0]?.buyer_id) {
                        const { data: buyerProfile } = await supabase
                          .from('profiles')
                          .select('full_name')
                          .eq('id', sellerOrders[0].buyer_id)
                          .single();
                        buyerName = buyerProfile?.full_name;
                      }
                      buyerEmail = sellerOrders[0]?.buyer_email || undefined;

                      // Calculate totals for all orders from this seller
                      const totalSaleAmount = sellerOrders.reduce(
                        (sum, o) => sum + (o.amount || 0),
                        0
                      );
                      const totalPlatformFee = sellerOrders.reduce(
                        (sum, o) => sum + (o.platform_fee || 0),
                        0
                      );
                      const totalNetAmount = sellerOrders.reduce(
                        (sum, o) => sum + (o.net_amount || 0),
                        0
                      );
                      const currency = sellerOrders[0]?.currency || 'USD';

                      // Send notification for the first order (representing the sale)
                      const notificationResult = await sendSellerSaleNotificationEmail({
                        sellerEmail: sellerUser.user.email,
                        sellerName,
                        productTitle: product.title || 'Product',
                        orderId: sellerOrders[0].id,
                        saleAmount: totalSaleAmount,
                        currency,
                        platformFee: totalPlatformFee,
                        netAmount: totalNetAmount,
                        buyerName,
                        buyerEmail,
                      });

                      if (notificationResult.success) {
                        console.log(
                          `✅ Seller notification sent to ${sellerUser.user.email} for order ${sellerOrders[0].id}`
                        );
                      } else {
                        console.error(
                          `❌ Failed to send seller notification:`,
                          notificationResult.error
                        );
                      }
                    } catch (sellerError) {
                      console.error(
                        `❌ Error sending seller notification for ${sellerId}:`,
                        sellerError
                      );
                    }
                  }
                } catch (error) {
                  console.error('❌ Error in seller notification process:', error);
                }
              })();

              return NextResponse.json({
                success: true,
                ordersCreated: insertedOrders.length,
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
        .select('id, user_id, title, price, currency')
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
          console.log('Order created:', {
            id: insertedOrders[0].id,
            product_id: insertedOrders[0].product_id,
            buyer_email: insertedOrders[0].buyer_email || 'MISSING',
            buyer_id: insertedOrders[0].buyer_id || 'N/A',
          });

          // Verify buyer_email is set, and update if missing
          if (!insertedOrders[0].buyer_email) {
            console.error('❌ WARNING: Order has no buyer_email! Attempting to fix...');
            console.error('Session customer_email:', session.customer_email);
            console.error('Session metadata:', metadata);

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
              console.error('❌ Session has no customer_email either! Email delivery will fail.');
            }
          }

          // Deliver product via email (non-blocking)
          console.log('📧 Triggering email delivery for order from process-order route...');
          deliverProductsForOrders(insertedOrders).catch(error => {
            console.error('❌ FATAL ERROR in email delivery:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          });

          // Send seller notification email (non-blocking)
          (async () => {
            try {
              console.log('📧 Sending seller notification email...');
              const supabaseAdmin = createServiceRoleClient();

              // Get seller email from auth.users
              const { data: sellerUser, error: sellerUserError } =
                await supabaseAdmin.auth.admin.getUserById(product.user_id);

              if (sellerUserError || !sellerUser?.user?.email) {
                console.error(
                  `❌ Could not get seller email for ${product.user_id}:`,
                  sellerUserError
                );
                return;
              }

              // Get seller profile for name
              const { data: sellerProfile } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', product.user_id)
                .single();
              const sellerName = sellerProfile?.full_name || sellerProfile?.username;

              // Get buyer info
              let buyerName: string | undefined;
              if (insertedOrders[0].buyer_id) {
                const { data: buyerProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', insertedOrders[0].buyer_id)
                  .single();
                buyerName = buyerProfile?.full_name;
              }

              const notificationResult = await sendSellerSaleNotificationEmail({
                sellerEmail: sellerUser.user.email,
                sellerName,
                productTitle: product.title || 'Product',
                orderId: insertedOrders[0].id,
                saleAmount: insertedOrders[0].amount || 0,
                currency: insertedOrders[0].currency || 'USD',
                platformFee: insertedOrders[0].platform_fee || 0,
                netAmount: insertedOrders[0].net_amount || 0,
                buyerName,
                buyerEmail: insertedOrders[0].buyer_email || undefined,
              });

              if (notificationResult.success) {
                console.log(
                  `✅ Seller notification sent to ${sellerUser.user.email} for order ${insertedOrders[0].id}`
                );
              } else {
                console.error(`❌ Failed to send seller notification:`, notificationResult.error);
              }
            } catch (sellerError) {
              console.error(`❌ Error sending seller notification:`, sellerError);
            }
          })();

          return NextResponse.json({
            success: true,
            ordersCreated: 1,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'No products to process',
    });
  } catch (error) {
    console.error('Process order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
