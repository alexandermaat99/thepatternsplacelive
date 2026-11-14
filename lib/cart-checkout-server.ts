import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getFabricPublicDetail } from '@/lib/fabric-catalog';
import { COMPANY_INFO } from '@/lib/company-info';
import { sendSellerSaleNotificationEmail } from '@/lib/email';
import { deliverProductsForOrders } from '@/lib/product-delivery';
import { awardPatternPointsOnce, PATTERN_POINTS } from '@/lib/pattern-points';
import { FABRIC_ORDER_SETTINGS, formatYardsLabel, isValidCut, maxOrderableYards, type Fulfillment } from '@/lib/fabric-orders';
import { handleFabricCheckoutCompleted } from '@/lib/fabric-order-server';
import { alertAdmin } from '@/lib/admin-alert';

// ---------------------------------------------------------------------------
// Fabric line preparation (shared by cart checkout)
// ---------------------------------------------------------------------------

export type FabricLine = {
  baseSku: string;
  name: string;
  yards: number;
  unitCents: number;
  lineCents: number;
  image: string | null;
};

type Failure = { error: string; status: number; baseSku?: string; maxYards?: number };

/** Reprice and validate requested cuts from the database (never trust client prices). */
export async function prepareFabricLines(
  requested: Map<string, number>
): Promise<{ lines: FabricLine[] } | Failure> {
  if (requested.size > FABRIC_ORDER_SETTINGS.maxLines) {
    return { error: 'Too many different fabrics in one order.', status: 400 };
  }
  const lines: FabricLine[] = [];
  for (const [baseSku, yards] of requested) {
    const fabric = await getFabricPublicDetail(baseSku);
    if (!fabric || fabric.sell_price == null) {
      return { error: `A fabric in your cart (${baseSku}) is no longer available.`, status: 409, baseSku };
    }
    const name = fabric.name?.trim() || fabric.sku;
    const max = maxOrderableYards(fabric.bolts);
    if (!isValidCut(yards, max)) {
      return {
        error:
          max < FABRIC_ORDER_SETTINGS.minYards
            ? `${name} just sold out.`
            : yards > max
              ? `${name}: we can cut up to ${formatYardsLabel(max)} in one piece right now. Please adjust your cart.`
              : `${name}: cuts are sold in ${FABRIC_ORDER_SETTINGS.stepYards}-yard steps with a ${FABRIC_ORDER_SETTINGS.minYards}-yard minimum.`,
        status: 409,
        baseSku,
        maxYards: max,
      };
    }
    lines.push({
      baseSku: fabric.sku,
      name,
      yards,
      unitCents: Math.round(fabric.sell_price * 100),
      lineCents: Math.round(fabric.sell_price * yards * 100),
      image: fabric.photo_url?.startsWith('https://') ? fabric.photo_url : null,
    });
  }
  return { lines };
}

/** Create a fabric order and hold its stock (all-or-nothing). */
export async function createAndReserveFabricOrder(params: {
  lines: FabricLine[];
  fulfillment: Fulfillment;
  shippingCents: number;
  userId: string | null;
  email: string | null;
}): Promise<{ order: { id: string; order_number: number } } | Failure> {
  const service = createServiceRoleClient();
  const subtotal = params.lines.reduce((sum, l) => sum + l.lineCents, 0);
  const { data: order, error } = await service
    .from('fabric_orders')
    .insert({
      user_id: params.userId,
      email: params.email,
      fulfillment: params.fulfillment,
      subtotal_cents: subtotal,
      shipping_cents: params.shippingCents,
      total_cents: subtotal + params.shippingCents,
    })
    .select('id, order_number')
    .single();
  if (error || !order) {
    console.error('Error creating fabric order:', error);
    return { error: 'Could not start checkout. Please try again.', status: 500 };
  }
  const { error: itemsError } = await service.from('fabric_order_items').insert(
    params.lines.map(l => ({
      order_id: order.id,
      base_sku: l.baseSku,
      name: l.name,
      yards: l.yards,
      unit_price_cents: l.unitCents,
      line_total_cents: l.lineCents,
    }))
  );
  if (itemsError) {
    await service.from('fabric_orders').delete().eq('id', order.id);
    console.error('Error creating fabric order items:', itemsError);
    return { error: 'Could not start checkout. Please try again.', status: 500 };
  }
  const { error: reserveError } = await service.rpc('reserve_fabric_order', { p_order_id: order.id });
  if (reserveError) {
    await service.from('fabric_orders').delete().eq('id', order.id);
    const shortSku = reserveError.message.match(/INSUFFICIENT_STOCK:(\S+)/)?.[1];
    const shortName = params.lines.find(l => l.baseSku === shortSku)?.name;
    return {
      error: shortName
        ? `Sorry, ${shortName} no longer has enough yardage in one piece. Please adjust your cart.`
        : 'Could not reserve your fabric. Please try again.',
      status: 409,
      baseSku: shortSku,
    };
  }
  return { order };
}

// ---------------------------------------------------------------------------
// After payment (webhook + success-page backup). Every step is idempotent.
// ---------------------------------------------------------------------------

type CompletedOrder = {
  id: string;
  product_id: string;
  seller_id: string;
  buyer_id: string | null;
  buyer_email: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
};

/**
 * Handles a paid unified-cart session: fabric order paid + emails, pattern
 * orders completed + files delivered + points + designer emails, then one
 * transfer per designer. Safe to call more than once for the same session.
 */
export async function handleCartCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return { fabricOrderId: null as string | null };
  const supabase = createServiceRoleClient();
  const buyerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const fabricOrderId = session.metadata?.fabric_order_id || null;

  // 1. Fabric
  if (fabricOrderId) {
    await handleFabricCheckoutCompleted(session, { mixedCart: true });
  }

  // 2. Patterns: pending -> completed (atomic: only the first caller gets rows back)
  const sessionSubtotal = session.amount_subtotal ?? 0;
  const sessionTax = session.total_details?.amount_tax ?? 0;
  const { data: pending } = await supabase
    .from('orders')
    .select('id, amount')
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending');

  const newlyCompleted: CompletedOrder[] = [];
  for (const row of pending ?? []) {
    const amountCents = Math.round(Number(row.amount) * 100);
    const taxShare = sessionSubtotal > 0 ? Math.round((sessionTax * amountCents) / sessionSubtotal) : 0;
    const { data } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        buyer_email: buyerEmail,
        total_amount: (amountCents + taxShare) / 100,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id, product_id, seller_id, buyer_id, buyer_email, amount, platform_fee, net_amount, currency');
    if (data?.[0]) newlyCompleted.push(data[0] as CompletedOrder);
  }

  if (newlyCompleted.length > 0) {
    await deliverProductsForOrders(newlyCompleted).catch(e => console.error('Delivery error:', e));
    await notifySellersAndAwardPoints(session, newlyCompleted, buyerEmail);
  }

  // 3. Pay designers (checks Stripe for transfers already made)
  await payoutSellers(session).catch(async e => {
    console.error('Seller payout failed:', e);
    await alertAdmin(
      `Seller payout failed for checkout ${session.id}`,
      `Error: ${e instanceof Error ? e.message : String(e)}\n\nThe buyer was charged; designers may not have been paid. It will retry when Stripe resends the webhook, or check Stripe → Connect → Transfers.`
    );
  });

  return { fabricOrderId };
}

async function notifySellersAndAwardPoints(
  session: Stripe.Checkout.Session,
  orders: CompletedOrder[],
  buyerEmail: string | null
) {
  const supabase = createServiceRoleClient();
  for (const o of orders) {
    if (o.buyer_id) await awardPatternPointsOnce(o.buyer_id, PATTERN_POINTS.BUY_PRODUCT, 'purchase', o.id);
  }
  const bySeller = new Map<string, CompletedOrder[]>();
  for (const o of orders) bySeller.set(o.seller_id, [...(bySeller.get(o.seller_id) ?? []), o]);

  for (const [sellerId, sellerOrders] of bySeller) {
    await awardPatternPointsOnce(sellerId, PATTERN_POINTS.SELL_PRODUCT, 'sale', `${session.id}:${sellerId}`);
    try {
      const [{ data: sellerUser }, { data: profile }, { data: products }] = await Promise.all([
        supabase.auth.admin.getUserById(sellerId),
        supabase.from('profiles').select('full_name, username').eq('id', sellerId).single(),
        supabase.from('products').select('id, title').in('id', sellerOrders.map(o => o.product_id)),
      ]);
      if (!sellerUser?.user?.email) continue;
      await sendSellerSaleNotificationEmail({
        sellerEmail: sellerUser.user.email,
        sellerName: profile?.full_name || profile?.username || undefined,
        productTitle: (products ?? []).map(p => p.title).join(', ') || 'Your pattern',
        orderId: sellerOrders[0].id,
        saleAmount: sellerOrders.reduce((s, o) => s + Number(o.amount), 0),
        currency: sellerOrders[0].currency || 'USD',
        platformFee: sellerOrders.reduce((s, o) => s + Number(o.platform_fee || 0), 0),
        netAmount: sellerOrders.reduce((s, o) => s + Number(o.net_amount || 0), 0),
        buyerEmail: buyerEmail ?? undefined,
      });
    } catch (e) {
      console.error(`Seller notification failed for ${sellerId}:`, e);
    }
  }
}

/**
 * One Stripe transfer per designer for their share (net of fees). Fabric
 * revenue stays on the platform. Skips designers already paid for this
 * checkout (looked up in Stripe by transfer group), so retries never double-pay.
 */
async function payoutSellers(session: Stripe.Checkout.Session) {
  const transferGroup = session.metadata?.transfer_group;
  if (!transferGroup || typeof session.payment_intent !== 'string') return;
  const supabase = createServiceRoleClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('seller_id, net_amount')
    .eq('stripe_session_id', session.id)
    .eq('status', 'completed');
  if (!orders?.length) return;

  const owed = new Map<string, number>();
  for (const o of orders) owed.set(o.seller_id, (owed.get(o.seller_id) ?? 0) + Math.round(Number(o.net_amount) * 100));

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
  const existing = await stripe.transfers.list({ transfer_group: transferGroup, limit: 100 });
  const alreadyPaid = new Set(
    existing.data.map(t => (typeof t.destination === 'string' ? t.destination : t.destination?.id))
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, stripe_account_id')
    .in('id', [...owed.keys()]);

  for (const [sellerId, cents] of owed) {
    const account = profiles?.find(p => p.id === sellerId)?.stripe_account_id;
    if (!account || cents <= 0 || alreadyPaid.has(account)) continue;
    await stripe.transfers.create(
      {
        amount: cents,
        currency: 'usd',
        destination: account,
        transfer_group: transferGroup,
        ...(chargeId && { source_transaction: chargeId }),
        description: `Pattern sales, checkout ${session.id}`,
        metadata: { session_id: session.id, seller_id: sellerId },
      },
      { idempotencyKey: `cart-transfer:${session.id}:${sellerId}` }
    );
  }
}

/** Checkout expired/abandoned: release fabric hold and expire pending pattern orders. */
export async function handleCartCheckoutExpired(session: Stripe.Checkout.Session) {
  const supabase = createServiceRoleClient();
  if (session.metadata?.fabric_order_id) {
    await supabase.rpc('release_fabric_order', { p_order_id: session.metadata.fabric_order_id, p_status: 'expired' });
  }
  await supabase.from('orders').update({ status: 'expired' }).eq('stripe_session_id', session.id).eq('status', 'pending');
}

