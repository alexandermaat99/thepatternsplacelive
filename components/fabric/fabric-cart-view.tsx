'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, Trash2, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFabricCart } from '@/hooks/useFabricCart';
import {
  FABRIC_ORDER_SETTINGS,
  formatCents,
  formatYardsLabel,
  shippingCentsFor,
  type Fulfillment,
} from '@/lib/fabric-orders';
import { cn } from '@/lib/utils';

export function FabricCartView() {
  const { items, ready, setYards, remove } = useFabricCart();
  const { minYards, stepYards, shipping, pickup } = FABRIC_ORDER_SETTINGS;
  const [fulfillment, setFulfillment] = useState<Fulfillment>(shipping.enabled ? 'ship' : 'pickup');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Back from Stripe without paying: release the held yardage right away.
  useEffect(() => {
    const canceled = new URLSearchParams(window.location.search).get('canceled');
    if (!canceled) return;
    fetch(`/api/fabric/orders/${encodeURIComponent(canceled)}/abandon`, { method: 'POST' }).catch(() => {});
    setNotice('Checkout canceled. Your fabric order is still here.');
    window.history.replaceState(null, '', '/fabric/cart');
  }, []);

  const subtotalCents = items.reduce((sum, i) => sum + Math.round(i.pricePerYard * i.yards * 100), 0);
  const shippingCents = shippingCentsFor(fulfillment, subtotalCents);

  const checkout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/fabric/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment,
          items: items.map(i => ({ baseSku: i.baseSku, yards: i.yards })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link href="/fabric">
          <ArrowLeft className="h-4 w-4" />
          Keep shopping fabric
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Your fabric order</h1>

      {notice && <p className="rounded-md border bg-muted/50 p-3 text-sm">{notice}</p>}

      {items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center space-y-3">
          <p className="text-muted-foreground">Your fabric order is empty.</p>
          <Button asChild>
            <Link href="/fabric">Browse fabric</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {items.map(item => (
              <li key={item.baseSku} className="flex gap-4 p-4">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="h-20 w-20 rounded-md object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-md bg-muted" />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between gap-3">
                    <Link href={`/fabric/${encodeURIComponent(item.baseSku)}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    <span className="font-semibold tabular-nums">
                      {formatCents(Math.round(item.pricePerYard * item.yards * 100))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCents(Math.round(item.pricePerYard * 100))}/yd · SKU {item.baseSku}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setYards(item.baseSku, Math.max(minYards, item.yards - stepYards))}
                      disabled={item.yards <= minYards}
                      aria-label="Less"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-16 text-center text-sm font-medium tabular-nums">
                      {formatYardsLabel(item.yards)}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setYards(item.baseSku, Math.min(FABRIC_ORDER_SETTINGS.maxYardsPerLine, item.yards + stepYards))}
                      aria-label="More"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-muted-foreground"
                      onClick={() => remove(item.baseSku)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <fieldset className="space-y-2">
            <legend className="font-semibold mb-2">How would you like to get it?</legend>
            {[
              shipping.enabled && {
                value: 'ship' as const,
                icon: Truck,
                title: 'Ship it',
                detail: `${shippingCentsFor('ship', subtotalCents) === 0 ? 'Free' : formatCents(shipping.flatRateCents)} US shipping${shipping.freeOverCents != null ? ` (free over ${formatCents(shipping.freeOverCents)})` : ''}. ${shipping.estimate}.`,
              },
              pickup.enabled && {
                value: 'pickup' as const,
                icon: Store,
                title: `Pick up in ${pickup.area}`,
                detail: `Free. ${pickup.instructions}`,
              },
            ]
              .filter(Boolean)
              .map(option => {
                const o = option as { value: Fulfillment; icon: typeof Truck; title: string; detail: string };
                return (
                  <label
                    key={o.value}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-lg border p-4',
                      fulfillment === o.value && 'border-primary ring-1 ring-primary'
                    )}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value={o.value}
                      checked={fulfillment === o.value}
                      onChange={() => setFulfillment(o.value)}
                      className="mt-1"
                    />
                    <o.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <span>
                      <span className="block font-medium">{o.title}</span>
                      <span className="block text-sm text-muted-foreground">{o.detail}</span>
                    </span>
                  </label>
                );
              })}
          </fieldset>

          <div className="space-y-1 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCents(subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>{fulfillment === 'ship' ? 'Shipping' : 'Pickup'}</span>
              <span className="tabular-nums">{shippingCents === 0 ? 'Free' : formatCents(shippingCents)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2 text-base font-semibold">
              <span>Total before tax</span>
              <span className="tabular-nums">{formatCents(subtotalCents + shippingCents)}</span>
            </div>
          </div>

          {error && <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          <Button size="lg" className="w-full" onClick={checkout} disabled={submitting}>
            {submitting ? 'Starting checkout…' : 'Checkout'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            We hold your fabric for {FABRIC_ORDER_SETTINGS.holdMinutes} minutes while you check out.
            Each cut is one continuous piece.
          </p>
        </>
      )}
    </div>
  );
}
