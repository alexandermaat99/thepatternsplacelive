import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { headers } from 'next/headers';
import { sendPurchaseEmail } from '@/lib/send-purchase-email';
import { sendSellerSaleNotificationEmail } from '@/lib/email';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import { awardPointsForPurchase, awardPointsForSale } from '@/lib/pattern-points';

// Calculate fees for an order using Etsy-style structure
// When tax is included, we maintain the seller's net amount by scaling the fee proportionally
// sellerSalesCount: number of completed sales for the seller (used for first 5 sales waiver)
async function calculateFees(
  amount: number,
  originalSubtotal?: number,
  sellerId?: string,
  supabase?: any
) {
  // Convert to cents for calculation
  const amountInCents = Math.round(amount * 100);

  // Check if seller qualifies for first 5 sales fee waiver
  let waivePlatformFees = false;
  if (sellerId && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('completed_sales_count')
        .eq('id', sellerId)
        .single();
      
      if (profile) {
        waivePlatformFees = (profile.completed_sales_count || 0) < 5;
      }
    } catch (error) {
      console.error('Error fetching seller sales count:', error);
    }
  }

  // If we have the original subtotal, maintain seller's net amount
  // This ensures that when tax is added, the seller gets the same net as before
  if (originalSubtotal && originalSubtotal !== amount) {
    // Calculate what the fee was on the original subtotal using Etsy structure
    const originalSubtotalCents = Math.round(originalSubtotal * 100);
    const originalFees = calculateEtsyFees(originalSubtotalCents, waivePlatformFees);
    const originalFeeCents = originalFees.totalFee;

    // Calculate original seller net
    const originalSellerNetCents = originalSubtotalCents - originalFeeCents;

    // Maintain the same seller net, so new fee = new total - original seller net
    const applicationFeeCents = amountInCents - originalSellerNetCents;

    // Convert back to dollars
    const platformFee = applicationFeeCents / 100; // Platform fee (scaled to maintain seller net)
    const stripeFee = 0; // Payment processing is included in total fee
    const netAmount = originalSellerNetCents / 100; // Seller's net (same as before tax)

    return {
      platformFee,
      stripeFee,
      netAmount,
      applicationFee: platformFee,
    };
  }

  // No original subtotal or amounts are the same - calculate normally using Etsy structure
  const fees = calculateEtsyFees(amountInCents, waivePlatformFees);
  const platformFee = fees.totalFee / 100;
  const stripeFee = 0; // Payment processing is included in total fee
  const netAmount = (amountInCents - fees.totalFee) / 100;

  return {
    platformFee,
    stripeFee,
    netAmount,
    applicationFee: platformFee,
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

  // Use service role client to bypass RLS for webhook operations
  // Webhooks run without user context, so RLS would block all operations
  const supabase = createServiceRoleClient();

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
              const orders = await Promise.all(
                items.map(async (item: { productId: string; quantity: number }) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;

                  const orderAmount = product.price * item.quantity;
                  // Allocate tax proportionally based on item's share of subtotal
                  const orderTotalAmount =
                    totalSubtotal > 0 ? orderAmount * (1 + taxRate) : orderAmount; // Fallback if no subtotal
                  // Calculate fees on total amount, passing original subtotal to maintain seller net
                  // Pass seller_id to check for first 5 sales waiver
                  const fees = await calculateFees(orderTotalAmount, orderAmount, product.user_id, supabase);
                  // Net amount should be total_amount (with tax) minus fees
                  const netAmount = orderTotalAmount - fees.platformFee - fees.stripeFee;

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
                    net_amount: netAmount,
                  };
                })
              );
              
              // Filter out null values
              const validOrders = orders.filter((order): order is NonNullable<typeof order> => order !== null);

              if (validOrders.length > 0) {
                const { error: orderError, data: insertedOrders } = await supabase
                  .from('orders')
                  .insert(validOrders)
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

                  // Send seller notification emails
                  console.log('📧 Sending seller notification emails...');
                  const supabaseAdmin = createServiceRoleClient();
                  const sellerNotifications = new Map<
                    string,
                    { orders: typeof insertedOrders; product: any }
                  >();

                  // Group orders by seller
                  for (const order of insertedOrders) {
                    const product = products.find(p => p.id === order.product_id);
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
                      buyerEmail = sellerOrders[0]?.buyer_email;

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
            // For single product checkout, calculate fees on total amount (including tax)
            // This ensures seller net stays consistent regardless of tax
            const orderSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : 0;
            const orderTotal = session.amount_total ? session.amount_total / 100 : 0;
            // Calculate fees on total amount, passing original subtotal to maintain seller net
            // Pass seller_id to check for first 5 sales waiver
            const fees = await calculateFees(orderTotal, orderSubtotal || orderTotal, product.user_id, supabase);
            // Net amount should be total_amount (with tax) minus fees
            const netAmount = orderTotal - fees.platformFee - fees.stripeFee;

            const { error: orderError, data: insertedOrders } = await supabase
              .from('orders')
              .insert({
                product_id: session.metadata?.productId,
                buyer_id: session.metadata?.buyerId || null,
                seller_id: product.user_id,
                stripe_session_id: session.id,
                status: 'completed',
                amount: orderSubtotal || orderTotal, // Subtotal (pre-tax) for reference
                total_amount: orderTotal, // Total including tax (matches Stripe dashboard)
                currency: session.currency?.toUpperCase() || 'USD',
                buyer_email: session.metadata?.buyerEmail || session.customer_email || null,
                platform_fee: fees.platformFee,
                stripe_fee: fees.stripeFee,
                net_amount: netAmount,
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

              // Send seller notification email
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
                } else {
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
                    console.error(
                      `❌ Failed to send seller notification:`,
                      notificationResult.error
                    );
                  }
                }
              } catch (sellerError) {
                console.error(`❌ Error sending seller notification:`, sellerError);
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
