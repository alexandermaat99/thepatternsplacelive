'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFabricCart } from '@/hooks/useFabricCart';
import {
  FABRIC_ORDER_SETTINGS,
  describeShipping,
  formatCents,
  formatYardsLabel,
  roundYards,
  type FabricShippingSettings,
} from '@/lib/fabric-orders';

const FRACTIONS: Record<number, string> = { 0.125: '⅛', 0.25: '¼', 0.5: '½', 0.75: '¾', 1: '1' };
const fraction = (yards: number) => FRACTIONS[yards] ?? String(yards);

/** Choose a cut length and add it to the fabric order. */
export function FabricOrderPanel({
  baseSku,
  name,
  pricePerYard,
  photoUrl,
  maxYards,
  shippingSettings,
}: {
  shippingSettings: FabricShippingSettings;
  baseSku: string;
  name: string;
  pricePerYard: number;
  photoUrl: string | null;
  /** Largest single cut available (largest bolt). */
  maxYards: number;
}) {
  const { minYards, stepYards } = FABRIC_ORDER_SETTINGS;
  const { shipping, pickup } = shippingSettings;
  const { add, items } = useFabricCart();
  const [yards, setYards] = useState(Math.min(1, maxYards) >= minYards ? Math.min(1, maxYards) : minYards);
  const [added, setAdded] = useState(false);

  const inCart = items.find(i => i.baseSku === baseSku)?.yards ?? 0;
  const remaining = roundYards(Math.max(0, maxYards - inCart));
  const canAdd = remaining >= minYards && yards <= remaining;

  if (maxYards < minYards) return null;

  const change = (delta: number) => {
    setAdded(false);
    setYards(y => roundYards(Math.min(Math.max(minYards, y + delta), Math.max(minYards, remaining))));
  };

  return (
    <section className="rounded-lg border border-border p-4 space-y-4" aria-label="Order this fabric">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">How much?</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => change(-stepYards)}
            disabled={yards <= minYards}
            aria-label={`Decrease by ${stepYards} yard`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-20 text-center font-semibold tabular-nums" aria-live="polite">
            {formatYardsLabel(yards)}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => change(stepYards)}
            disabled={yards + stepYards > remaining}
            aria-label={`Increase by ${stepYards} yard`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">
          {formatCents(Math.round(pricePerYard * 100))}/yd × {formatYardsLabel(yards)}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatCents(Math.round(pricePerYard * yards * 100))}
        </span>
      </div>

      {canAdd ? (
        <Button
          className="w-full"
          onClick={() => {
            if (add({ baseSku, name, yards, pricePerYard, photoUrl }, maxYards)) setAdded(true);
          }}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Add to cart
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          You have all available yardage of this fabric in your cart.
        </p>
      )}

      {(added || inCart > 0) && (
        <Link
          href="/cart"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
        >
          {added && <Check className="h-4 w-4 text-green-600" />}
          {added ? 'Added. ' : ''}View cart ({formatYardsLabel(inCart)} of this fabric)
        </Link>
      )}

      <ul className="text-xs text-muted-foreground space-y-1 border-t pt-3">
        <li>
          Cut in {fraction(stepYards)}-yard increments, {fraction(minYards)}-yard minimum. Each cut
          is one continuous piece.
        </li>
        {shipping.enabled && (
          <li>
            {describeShipping(shippingSettings)}. {shipping.estimate}.
          </li>
        )}
        {pickup.enabled && <li>Free local pickup in {pickup.area}.</li>}
      </ul>
    </section>
  );
}
