import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getFabricPublicDetail } from '@/lib/fabric-catalog';
import {
  FABRIC_ORDER_SETTINGS,
  formatYardsLabel,
  isValidCut,
  maxOrderableYards,
  shippingCentsFor,
  type Fulfillment,
} from '@/lib/fabric-orders';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';

type RequestBody = { items?: { baseSku?: unknown; yards?: unknown }[]; fulfillment?: unknown };

/**
 * POST /api/fabric/checkout
 * Reprices the cart from the database, holds the stock (per bolt, all-or-
 * nothing), and starts a Stripe Checkout session. Fabric is our own
 * inventory, so this is a normal platform charge (no Connect transfer).
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(getClientIdentifier(request), RATE_LIMITS.STANDARD);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const fulfillment = body.fulfillment as Fulfillment;
  const { shipping, pickup, maxLines } = FABRIC_ORDER_SETTINGS;
  if (
    (fulfillment !== 'ship' && fulfillment !== 'pickup') ||
    (fulfillment === 'ship' && !shipping.enabled) ||
    (fulfillment === 'pickup' && !pickup.enabled)
  ) {
    return NextResponse.json({ error: 'Choose shipping or pickup.' }, { status: 400 });
  }

  // Merge duplicate lines and validate shape.
  const requested = new Map<string, number>();
  for (const item of body.items ?? []) {
    if (typeof item.baseSku !== 'string' || typeof item.yards !== 'number') {
      return NextResponse.json({ error: 'Invalid order.' }, { status: 400 });
    }
    requested.set(item.baseSku, (requested.get(item.baseSku) ?? 0) + item.yards);
  }
  if (requested.size === 0 || requested.size > maxLines) {
    return NextResponse.json({ error: 'Your fabric order is empty.' }, { status: 400 });
  }

  // Reprice everything from the database (never trust client prices).
  const lines: {
    baseSku: string;
    name: string;
    yards: number;
    unitCents: number;
    lineCents: number;
    image: string | null;
  }[] = [];
  for (const [baseSku, yards] of requested) {
    const fabric = await getFabricPublicDetail(baseSku);
    if (!fabric || fabric.sell_price == null) {
      return NextResponse.json({ error: `A fabric in your order (${baseSku}) is no longer available.` }, { status: 409 });
    }
    const name = fabric.name?.trim() || fabric.sku;
    const max = maxOrderableYards(fabric.bolts);
    if (!isValidCut(yards, max)) {
      return NextResponse.json(
        {
          error:
            max < FABRIC_ORDER_SETTINGS.minYards
              ? `${name} just sold out.`
              : `${name}: we can cut up to ${formatYardsLabel(max)} in one piece right now. Please adjust your order.`,
          baseSku,
          maxYards: max,
        },
        { status: 409 }
      );
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

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineCents, 0);
  const shippingCents = shippingCentsFor(fulfillment, subtotalCents);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const service = createServiceRoleClient();

  // 1. Create the order
  const { data: order, error: orderError } = await service
    .from('fabric_orders')
    .insert({
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      fulfillment,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: subtotalCents + shippingCents,
    })
    .select('id, order_number')
    .single();
  if (orderError || !order) {
    console.error('Error creating fabric order:', orderError);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }

  const { error: itemsError } = await service.from('fabric_order_items').insert(
    lines.map(l => ({
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
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }

  // 2. Hold the stock (atomic; fails if someone else just bought it)
  const { error: reserveError } = await service.rpc('reserve_fabric_order', { p_order_id: order.id });
  if (reserveError) {
    await service.from('fabric_orders').delete().eq('id', order.id);
    const shortSku = reserveError.message.match(/INSUFFICIENT_STOCK:(\S+)/)?.[1];
    const shortName = lines.find(l => l.baseSku === shortSku)?.name;
    console.error('Error reserving fabric:', reserveError.message);
    return NextResponse.json(
      {
        error: shortName
          ? `Sorry, ${shortName} no longer has enough yardage in one piece. Please adjust your order.`
          : 'Could not reserve your fabric. Please try again.',
        baseSku: shortSku,
      },
      { status: 409 }
    );
  }

  // 3. Stripe Checkout
  const origin = request.nextUrl.origin;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lines.map(l => ({
        price_data: {
          currency: 'usd',
          unit_amount: l.lineCents,
          product_data: {
            name: `${l.name} (${formatYardsLabel(l.yards)})`,
            description: `Fabric, SKU ${l.baseSku}, cut as one continuous piece`,
            ...(l.image && { images: [l.image] }),
            tax_code: FABRIC_ORDER_SETTINGS.stripeTaxCode,
          },
        },
        quantity: 1,
      })),
      automatic_tax: { enabled: true },
      phone_number_collection: { enabled: true },
      customer_email: user?.email || undefined,
      expires_at: Math.floor(Date.now() / 1000) + FABRIC_ORDER_SETTINGS.holdMinutes * 60,
      success_url: `${origin}/fabric/order/${order.id}?placed=1`,
      cancel_url: `${origin}/fabric/cart?canceled=${order.id}`,
      metadata: { type: 'fabric_order', fabric_order_id: order.id },
      payment_intent_data: {
        description: `Fabric order #${order.order_number}`,
        metadata: { type: 'fabric_order', fabric_order_id: order.id },
      },
    };

    if (fulfillment === 'ship') {
      params.shipping_address_collection = { allowed_countries: ['US'] };
      params.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingCents, currency: 'usd' },
            display_name: shippingCents === 0 ? 'Free shipping' : 'Standard shipping',
          },
        },
      ];
    } else {
      params.custom_text = {
        submit: { message: `Local pickup in ${pickup.area}. ${pickup.instructions}` },
      };
    }

    const session = await getStripe().checkout.sessions.create(params);
    await service.from('fabric_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating fabric checkout session:', error);
    await service.rpc('release_fabric_order', { p_order_id: order.id, p_status: 'cancelled' });
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
