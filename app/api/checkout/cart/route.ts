import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import { getStripe, formatAmountForStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { calculateEtsyFees, sellerHasFeeWaiver } from '@/lib/company-info';
import { canReceiveSales } from '@/lib/stripe-connect';
import { FABRIC_ORDER_SETTINGS, formatYardsLabel, shippingCentsFor, type Fulfillment } from '@/lib/fabric-orders';
import { createAndReserveFabricOrder, prepareFabricLines, type FabricLine } from '@/lib/cart-checkout-server';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';

type Body = {
  patterns?: { productId?: unknown }[];
  /** Legacy shape from older clients: [{ productId, quantity }] */
  items?: { productId?: unknown }[];
  fabric?: { baseSku?: unknown; yards?: unknown }[];
  fulfillment?: unknown;
};

/**
 * POST /api/checkout/cart
 * One checkout for everything in the cart: paid patterns from any number of
 * designers, plus fabric. The platform takes the payment ("separate charges
 * and transfers"); after payment each designer is paid their share by
 * transfer, and fabric revenue stays with the platform.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(getClientIdentifier(request), RATE_LIMITS.STANDARD);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const productIds = [
    ...new Set(
      [...(body.patterns ?? []), ...(body.items ?? [])]
        .map(p => p.productId)
        .filter((id): id is string => typeof id === 'string')
    ),
  ];
  const fabricRequested = new Map<string, number>();
  for (const f of body.fabric ?? []) {
    if (typeof f.baseSku !== 'string' || typeof f.yards !== 'number') {
      return NextResponse.json({ error: 'Invalid cart.' }, { status: 400 });
    }
    fabricRequested.set(f.baseSku, (fabricRequested.get(f.baseSku) ?? 0) + f.yards);
  }
  if (productIds.length === 0 && fabricRequested.size === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const hasFabric = fabricRequested.size > 0;
  const fulfillment = body.fulfillment as Fulfillment;
  if (
    hasFabric &&
    ((fulfillment !== 'ship' && fulfillment !== 'pickup') ||
      (fulfillment === 'ship' && !FABRIC_ORDER_SETTINGS.shipping.enabled) ||
      (fulfillment === 'pickup' && !FABRIC_ORDER_SETTINGS.pickup.enabled))
  ) {
    return NextResponse.json({ error: 'Choose shipping or pickup for your fabric.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stripe = getStripe();

  // ---- Patterns: validate, check each designer can be paid, compute fees ----
  type PatternLine = {
    product: { id: string; title: string; description: string | null; price: number; currency: string; image_url: string | null; user_id: string };
    priceCents: number;
    feeCents: number;
  };
  const patternLines: PatternLine[] = [];
  if (productIds.length > 0) {
    // User-scoped query: hidden or inactive listings are excluded by RLS.
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, description, price, currency, image_url, user_id, is_free')
      .in('id', productIds)
      .eq('is_active', true);
    if (error) return NextResponse.json({ error: 'Could not load your cart.' }, { status: 500 });
    const paid = (products ?? []).filter(p => !p.is_free && Number(p.price) > 0);
    if (paid.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some patterns in your cart are no longer available. Please refresh your cart.' },
        { status: 409 }
      );
    }

    const sellerIds = [...new Set(paid.map(p => p.user_id))];
    const { data: sellers } = await createServiceRoleClient()
      .from('profiles')
      .select('id, username, stripe_account_id, completed_sales_count, platform_fee_waived_until')
      .in('id', sellerIds);
    for (const sellerId of sellerIds) {
      const seller = sellers?.find(s => s.id === sellerId);
      let ready = false;
      if (seller?.stripe_account_id) {
        try {
          ready = canReceiveSales(await stripe.accounts.retrieve(seller.stripe_account_id));
        } catch {
          ready = false;
        }
      }
      if (!ready) {
        const titles = paid.filter(p => p.user_id === sellerId).map(p => p.title).join(', ');
        return NextResponse.json(
          { error: `"${titles}" can't be purchased right now because the designer's payouts aren't set up. Please remove it and try again.` },
          { status: 409 }
        );
      }
    }

    for (const product of paid) {
      const seller = sellers!.find(s => s.id === product.user_id)!;
      const priceCents = formatAmountForStripe(Number(product.price), product.currency || 'USD');
      const fees = calculateEtsyFees(priceCents, sellerHasFeeWaiver(seller));
      patternLines.push({ product: { ...product, price: Number(product.price) }, priceCents, feeCents: fees.totalFee });
    }
  }

  // ---- Fabric: reprice, then hold stock ----
  let fabricLines: FabricLine[] = [];
  let fabricOrder: { id: string; order_number: number } | null = null;
  let shippingCents = 0;
  if (hasFabric) {
    const prepared = await prepareFabricLines(fabricRequested);
    if ('error' in prepared) return NextResponse.json(prepared, { status: prepared.status });
    fabricLines = prepared.lines;
    shippingCents = shippingCentsFor(fulfillment, fabricLines.reduce((s, l) => s + l.lineCents, 0));
    const reserved = await createAndReserveFabricOrder({
      lines: fabricLines,
      fulfillment,
      shippingCents,
      userId: user?.id ?? null,
      email: user?.email ?? null,
    });
    if ('error' in reserved) return NextResponse.json(reserved, { status: reserved.status });
    fabricOrder = reserved.order;
  }

  const service = createServiceRoleClient();
  const releaseFabric = async () => {
    if (fabricOrder) {
      await service.rpc('release_fabric_order', { p_order_id: fabricOrder.id, p_status: 'cancelled' });
    }
  };

  // ---- Stripe Checkout (platform charge; designers are paid after payment) ----
  const transferGroup = `cart_${randomUUID()}`;
  const origin = request.nextUrl.origin;
  let session: Stripe.Checkout.Session;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        ...patternLines.map(l => ({
          price_data: {
            currency: (l.product.currency || 'USD').toLowerCase(),
            unit_amount: l.priceCents,
            product_data: {
              name: l.product.title,
              ...(l.product.description && { description: l.product.description.slice(0, 500) }),
              ...(l.product.image_url?.startsWith('https://') && { images: [l.product.image_url] }),
              tax_code: 'txcd_10301000', // digital goods
            },
          },
          quantity: 1,
        })),
        ...fabricLines.map(l => ({
          price_data: {
            currency: 'usd',
            unit_amount: l.lineCents,
            product_data: {
              name: `${l.name} (${formatYardsLabel(l.yards)} of fabric)`,
              description: `Fabric, SKU ${l.baseSku}, cut as one continuous piece`,
              ...(l.image && { images: [l.image] }),
              tax_code: FABRIC_ORDER_SETTINGS.stripeTaxCode,
            },
          },
          quantity: 1,
        })),
      ],
      automatic_tax: { enabled: true },
      customer_email: user?.email || undefined,
      expires_at: Math.floor(Date.now() / 1000) + FABRIC_ORDER_SETTINGS.holdMinutes * 60,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart${fabricOrder ? `?canceled=${fabricOrder.id}` : ''}`,
      metadata: {
        type: 'cart',
        transfer_group: transferGroup,
        ...(fabricOrder && { fabric_order_id: fabricOrder.id }),
        ...(user?.id && { buyerId: user.id }),
        ...(user?.email && { buyerEmail: user.email }),
      },
      payment_intent_data: {
        transfer_group: transferGroup,
        ...(fabricOrder && { description: `Includes fabric order #${fabricOrder.order_number}` }),
      },
    };
    if (hasFabric) {
      params.phone_number_collection = { enabled: true };
      if (fulfillment === 'ship') {
        params.shipping_address_collection = { allowed_countries: ['US'] };
        params.shipping_options = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: shippingCents, currency: 'usd' },
              display_name: shippingCents === 0 ? 'Free shipping' : 'Standard shipping (fabric)',
            },
          },
        ];
      } else {
        params.custom_text = {
          submit: {
            message: `Fabric: local pickup in ${FABRIC_ORDER_SETTINGS.pickup.area}. ${FABRIC_ORDER_SETTINGS.pickup.instructions}`,
          },
        };
      }
    }
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    console.error('Error creating cart checkout session:', error);
    await releaseFabric();
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }

  // ---- Record what was bought (pending until paid) ----
  if (fabricOrder) {
    await service.from('fabric_orders').update({ stripe_session_id: session.id }).eq('id', fabricOrder.id);
  }
  if (patternLines.length > 0) {
    const { error } = await service.from('orders').insert(
      patternLines.map(l => ({
        product_id: l.product.id,
        seller_id: l.product.user_id,
        buyer_id: user?.id ?? null,
        buyer_email: user?.email ?? null,
        stripe_session_id: session.id,
        status: 'pending',
        amount: l.priceCents / 100,
        total_amount: l.priceCents / 100,
        currency: l.product.currency || 'USD',
        platform_fee: l.feeCents / 100,
        stripe_fee: 0,
        net_amount: (l.priceCents - l.feeCents) / 100,
      }))
    );
    if (error) {
      console.error('Error recording cart orders:', error);
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      await releaseFabric();
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }
  }

  return NextResponse.json({ url: session.url });
}
