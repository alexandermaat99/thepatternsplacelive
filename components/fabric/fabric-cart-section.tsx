'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, Truck, Store, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFabricCart } from '@/hooks/useFabricCart';
import {
  FABRIC_ORDER_SETTINGS,
  formatCents,
  formatYardsLabel,
  shippingCentsFor,
  type Fulfillment,
} from '@/lib/fabric-orders';
import { cn } from '@/lib/utils';

/** Fabric lines + ship/pickup choice, shown inside the main cart. */
export function FabricCartSection({
  fulfillment,
  onFulfillmentChange,
  onRemoveRequest,
}: {
  fulfillment: Fulfillment;
  onFulfillmentChange: (f: Fulfillment) => void;
  /** Ask the shopper to confirm before removing (the cart shows a dialog). */
  onRemoveRequest: (baseSku: string, name: string) => void;
}) {
  const { items, setYards } = useFabricCart();
  const { minYards, stepYards, maxYardsPerLine, shipping, pickup } = FABRIC_ORDER_SETTINGS;
  if (items.length === 0) return null;
  const subtotalCents = items.reduce((s, i) => s + Math.round(i.pricePerYard * i.yards * 100), 0);

  const options = [
    shipping.enabled && {
      value: 'ship' as const,
      icon: Truck,
      title: 'Ship my fabric',
      detail: `${shippingCentsFor('ship', subtotalCents) === 0 ? 'Free' : formatCents(shipping.flatRateCents)} US shipping${shipping.freeOverCents != null ? ` (free over ${formatCents(shipping.freeOverCents)} of fabric)` : ''}. ${shipping.estimate}.`,
    },
    pickup.enabled && {
      value: 'pickup' as const,
      icon: Store,
      title: `Pick up in ${pickup.area}`,
      detail: `Free. ${pickup.instructions}`,
    },
  ].filter(Boolean) as { value: Fulfillment; icon: typeof Truck; title: string; detail: string }[];

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold pt-2">
        <Scissors className="h-5 w-5" /> Fabric
      </h2>
      {items.map(item => (
        <Card key={item.baseSku}>
          <CardContent className="p-6">
            <div className="flex gap-4">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.name} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between gap-3">
                  <Link href={`/fabric/${encodeURIComponent(item.baseSku)}`} className="font-semibold text-lg truncate hover:underline">
                    {item.name}
                  </Link>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {formatCents(Math.round(item.pricePerYard * item.yards * 100))}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCents(Math.round(item.pricePerYard * 100))}/yd · cut as one piece
                </p>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Less"
                    onClick={() => setYards(item.baseSku, Math.max(minYards, item.yards - stepYards))}
                    disabled={item.yards <= minYards}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-16 text-center text-sm font-medium tabular-nums">{formatYardsLabel(item.yards)}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" aria-label="More"
                    onClick={() => setYards(item.baseSku, Math.min(maxYardsPerLine, item.yards + stepYards))}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:text-red-700"
                    onClick={() => onRemoveRequest(item.baseSku, item.name)} aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">How would you like to get your fabric?</legend>
        {options.map(o => (
          <label key={o.value}
            className={cn('flex cursor-pointer gap-3 rounded-lg border p-4', fulfillment === o.value && 'border-primary ring-1 ring-primary')}>
            <input type="radio" name="fulfillment" value={o.value} checked={fulfillment === o.value}
              onChange={() => onFulfillmentChange(o.value)} className="mt-1" />
            <o.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <span>
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
