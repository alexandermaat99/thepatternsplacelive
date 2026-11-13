import type Stripe from 'stripe';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { COMPANY_INFO } from '@/lib/company-info';
import { formatCents, formatYardsLabel } from '@/lib/fabric-orders';
import { getFabricShippingSettings } from '@/lib/fabric-settings-server';
import { awardPatternPointsOnce, PATTERN_POINTS } from '@/lib/pattern-points';

type OrderWithItems = {
  id: string;
  order_number: number;
  user_id: string | null;
  email: string | null;
  status: string;
  fulfillment: 'ship' | 'pickup';
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  shipping_name: string | null;
  shipping_address: Record<string, string | null> | null;
  phone: string | null;
  tracking_number: string | null;
  admin_notes: string | null;
  fabric_order_items: { base_sku: string; name: string; yards: number; line_total_cents: number; allocated_sku: string | null }[];
};

export async function loadFabricOrder(orderId: string): Promise<OrderWithItems | null> {
  const { data } = await createServiceRoleClient()
    .from('fabric_orders')
    .select('*, fabric_order_items(base_sku, name, yards, line_total_cents, allocated_sku)')
    .eq('id', orderId)
    .single();
  return (data as OrderWithItems) ?? null;
}

function formatAddress(a: OrderWithItems['shipping_address']): string {
  if (!a) return '';
  return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(', '), a.country]
    .filter(Boolean)
    .join('\n');
}

function itemsText(order: OrderWithItems, includeBolt = false): string {
  return order.fabric_order_items
    .map(
      i =>
        `• ${i.name}: ${formatYardsLabel(Number(i.yards))}, ${formatCents(i.line_total_cents)}` +
        (includeBolt ? `  [cut from bolt ${i.allocated_sku ?? '?'}]` : '')
    )
    .join('\n');
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
  const fromName = process.env.RESEND_FROM_NAME || COMPANY_INFO.name;
  const { error } = await resend.emails.send({ from: `${fromName} <${fromEmail}>`, to, subject, text });
  if (error) console.error('Fabric order email failed:', error);
}

function siteUrl() {
  return COMPANY_INFO.urls.website;
}

/** Customer confirmation + admin "new order" notification. */
export async function sendFabricOrderPlacedEmails(order: OrderWithItems) {
  const shippingSettings = await getFabricShippingSettings();
  const totals = [
    `Subtotal: ${formatCents(order.subtotal_cents)}`,
    order.fulfillment === 'ship' ? `Shipping: ${formatCents(order.shipping_cents)}` : 'Pickup: free',
    order.tax_cents ? `Tax: ${formatCents(order.tax_cents)}` : null,
    `Total: ${formatCents(order.total_cents)}`,
  ]
    .filter(Boolean)
    .join('\n');
  const fulfillmentText =
    order.fulfillment === 'ship'
      ? `Shipping to:\n${order.shipping_name ?? ''}\n${formatAddress(order.shipping_address)}\n\n${shippingSettings.shipping.estimate}. We'll email your tracking number when it ships.`
      : `Local pickup in ${shippingSettings.pickup.area}. ${shippingSettings.pickup.instructions}`;

  if (order.email) {
    await sendEmail(
      order.email,
      `Your fabric order #${order.order_number} is confirmed`,
      `Thanks for your order!\n\nOrder #${order.order_number}\n\n${itemsText(order)}\n\n${totals}\n\n${fulfillmentText}\n\nEach cut is one continuous piece. View your order: ${siteUrl()}/fabric/order/${order.id}\n\nQuestions? Reply to ${COMPANY_INFO.email.support}.\n\n${COMPANY_INFO.name}`
    );
  }

  await sendEmail(
    COMPANY_INFO.email.general,
    `New fabric order #${order.order_number} (${order.fulfillment === 'ship' ? 'SHIP' : 'PICKUP'}): ${formatCents(order.total_cents)}`,
    `${order.admin_notes ? `⚠️ ${order.admin_notes}\n\n` : ''}Cut list:\n${itemsText(order, true)}\n\n${totals}\n\nCustomer: ${order.email ?? '?'}${order.phone ? `, ${order.phone}` : ''}\n\n${order.fulfillment === 'ship' ? `Ship to:\n${order.shipping_name ?? ''}\n${formatAddress(order.shipping_address)}` : 'Local pickup: email the customer to arrange.'}\n\nManage: ${siteUrl()}/admin/fabric-orders`
  );
}

export async function sendFabricOrderShippedEmail(order: OrderWithItems) {
  if (!order.email) return;
  const body =
    order.fulfillment === 'ship'
      ? `Your fabric order #${order.order_number} has shipped!${order.tracking_number ? `\n\nTracking number: ${order.tracking_number}` : ''}\n\n${itemsText(order)}`
      : `Thanks for picking up your fabric order #${order.order_number}!\n\n${itemsText(order)}`;
  await sendEmail(
    order.email,
    order.fulfillment === 'ship' ? `Your fabric order #${order.order_number} shipped` : `Fabric order #${order.order_number} picked up`,
    `${body}\n\nWe'd love to see what you make: tag @thepatternsplace on Instagram.\n\n${COMPANY_INFO.name}`
  );
}

/**
 * Webhook: checkout.session.completed for a session that includes fabric.
 * Idempotent. In a mixed cart (patterns + fabric), the session totals include
 * the patterns too, so only shipping comes from Stripe and tax is allocated
 * by the fabric's share of the subtotal.
 */
export async function handleFabricCheckoutCompleted(
  session: Stripe.Checkout.Session,
  options: { mixedCart?: boolean } = {}
) {
  const orderId = session.metadata?.fabric_order_id;
  if (!orderId) return;
  const supabase = createServiceRoleClient();
  const existingOrder = await loadFabricOrder(orderId);
  if (!existingOrder) return;
  const sessionSubtotal = session.amount_subtotal ?? 0;
  const sessionTax = session.total_details?.amount_tax ?? 0;
  const shippingCents = session.total_details?.amount_shipping ?? 0;
  const fabricSubtotal = options.mixedCart ? existingOrder.subtotal_cents : sessionSubtotal;
  const fabricTax = options.mixedCart
    ? sessionSubtotal > 0
      ? Math.round((sessionTax * fabricSubtotal) / sessionSubtotal)
      : 0
    : sessionTax;
  const shipping =
    (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } } })
      .collected_information?.shipping_details ??
    (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;

  const paidFields = {
    paid_at: new Date().toISOString(),
    email: session.customer_details?.email ?? null,
    phone: session.customer_details?.phone ?? null,
    shipping_name: shipping?.name ?? null,
    shipping_address: shipping?.address ?? null,
    subtotal_cents: fabricSubtotal,
    shipping_cents: shippingCents,
    tax_cents: fabricTax,
    total_cents: options.mixedCart ? fabricSubtotal + shippingCents + fabricTax : (session.amount_total ?? 0),
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  };

  const { data: updated } = await supabase
    .from('fabric_orders')
    .update({ status: 'paid', ...paidFields })
    .eq('id', orderId)
    .eq('status', 'awaiting_payment')
    .select('id');

  if (!updated?.length) {
    const existing = await loadFabricOrder(orderId);
    if (!existing || (existing.status !== 'expired' && existing.status !== 'cancelled')) return; // already processed
    // Rare race: the hold was released (abandoned/expired) but payment still went
    // through. Record the payment and flag it: stock was returned to inventory.
    await supabase
      .from('fabric_orders')
      .update({
        status: 'paid',
        ...paidFields,
        admin_notes:
          'PAID AFTER THE STOCK HOLD WAS RELEASED. Check the bolts still have this yardage before cutting; refund if not.',
      })
      .eq('id', orderId);
  }

  const order = await loadFabricOrder(orderId);
  if (!order) return;
  if (order.user_id) {
    await awardPatternPointsOnce(order.user_id, PATTERN_POINTS.BUY_PRODUCT, 'fabric_order', order.id);
  }
  await sendFabricOrderPlacedEmails(order);
}

/** Webhook: checkout.session.expired for a fabric order. Returns the hold. */
export async function handleFabricCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.fabric_order_id;
  if (!orderId) return;
  await createServiceRoleClient().rpc('release_fabric_order', { p_order_id: orderId, p_status: 'expired' });
}

/** Yards of this fabric currently held in unpaid checkouts (released within 30 minutes if not bought). */
export async function getHeldYards(baseSku: string): Promise<number> {
  const { data } = await createServiceRoleClient()
    .from('fabric_order_items')
    .select('yards, fabric_orders!inner(status)')
    .eq('base_sku', baseSku)
    .eq('fabric_orders.status', 'awaiting_payment');
  return (data ?? []).reduce((sum, row) => sum + Number(row.yards), 0);
}
