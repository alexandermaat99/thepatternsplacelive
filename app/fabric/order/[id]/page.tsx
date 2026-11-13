import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle, Clock, Package, Store, Truck } from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ClearFabricCart } from '@/components/fabric/clear-fabric-cart';
import { loadFabricOrder } from '@/lib/fabric-order-server';
import { FABRIC_ORDER_SETTINGS, formatCents, formatYardsLabel } from '@/lib/fabric-orders';

export const metadata: Metadata = { title: 'Fabric order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The order id is an unguessable UUID that only the buyer receives (Stripe
// redirect + confirmation email), so it works as the link to this page.
export default async function FabricOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  if (!UUID.test(id)) notFound();
  const order = await loadFabricOrder(id);
  if (!order || order.status === 'pending') notFound();

  const statusInfo: Record<string, { icon: typeof CheckCircle; title: string; text: string }> = {
    awaiting_payment: { icon: Clock, title: 'Finishing up your payment…', text: 'This usually takes a few seconds. Refresh in a moment, or check your email for confirmation.' },
    paid: {
      icon: CheckCircle,
      title: 'Thanks! Your order is confirmed',
      text:
        order.fulfillment === 'ship'
          ? `We're cutting your fabric now. ${FABRIC_ORDER_SETTINGS.shipping.estimate}, and we'll email tracking when it ships.`
          : FABRIC_ORDER_SETTINGS.pickup.instructions,
    },
    shipped: { icon: Truck, title: 'Your order has shipped', text: order.tracking_number ? `Tracking number: ${order.tracking_number}` : 'It is on its way.' },
    picked_up: { icon: Package, title: 'Picked up. Happy sewing!', text: 'Thanks for shopping with us.' },
    cancelled: { icon: Clock, title: 'This order was cancelled', text: 'Questions? Contact us and we will help.' },
    expired: { icon: Clock, title: 'This checkout expired', text: 'No payment was taken. Your fabric order is still in your cart if you want to try again.' },
  };
  const info = statusInfo[order.status] ?? statusInfo.paid;

  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      {placed && order.status !== 'expired' && <ClearFabricCart />}
      <div className="container mx-auto max-w-2xl px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <info.icon className="h-12 w-12 mx-auto text-green-600" />
          <h1 className="text-2xl sm:text-3xl font-bold">{info.title}</h1>
          <p className="text-muted-foreground">{info.text}</p>
          <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
        </div>

        <ul className="divide-y rounded-lg border">
          {order.fabric_order_items.map(item => (
            <li key={item.base_sku} className="flex justify-between gap-3 p-4">
              <span>
                <Link href={`/fabric/${encodeURIComponent(item.base_sku)}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <span className="block text-sm text-muted-foreground">{formatYardsLabel(Number(item.yards))}, one continuous piece</span>
              </span>
              <span className="tabular-nums">{formatCents(item.line_total_cents)}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border p-4 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCents(order.subtotal_cents)}</span></div>
          <div className="flex justify-between">
            <span className="inline-flex items-center gap-1.5">
              {order.fulfillment === 'ship' ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              {order.fulfillment === 'ship' ? 'Shipping' : `Pickup in ${FABRIC_ORDER_SETTINGS.pickup.area}`}
            </span>
            <span>{order.shipping_cents ? formatCents(order.shipping_cents) : 'Free'}</span>
          </div>
          {order.tax_cents > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatCents(order.tax_cents)}</span></div>}
          <div className="flex justify-between border-t pt-2 mt-2 font-semibold"><span>Total</span><span>{formatCents(order.total_cents)}</span></div>
        </div>

        <div className="flex justify-center gap-3">
          <Button asChild><Link href="/fabric">Shop more fabric</Link></Button>
          <Button asChild variant="outline"><Link href="/marketplace">Find a pattern</Link></Button>
        </div>
      </div>
      <Footer />
    </>
  );
}
