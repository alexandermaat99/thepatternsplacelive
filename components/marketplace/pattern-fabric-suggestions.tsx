'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFabricCart } from '@/hooks/useFabricCart';
import { suggestFabrics, type OrderableFabric } from '@/lib/fabric-match';
import { formatYardage, type FabricRequirements } from '@/lib/fabric-requirements';
import { formatCents } from '@/lib/fabric-orders';

/** "Buy fabric for this pattern": in-stock fabrics that suit it, with the right yardage. */
export function PatternFabricSuggestions({
  requirements,
  fabrics,
}: {
  requirements: FabricRequirements;
  fabrics: OrderableFabric[];
}) {
  const [sizeIndex, setSizeIndex] = useState(0);
  const { add, items } = useFabricCart();
  const suggestions = useMemo(
    () => suggestFabrics(requirements, sizeIndex, fabrics),
    [requirements, sizeIndex, fabrics]
  );
  const inCart = (sku: string) => items.find(i => i.baseSku === sku)?.yards ?? 0;

  return (
    <section className="border-t pt-4 space-y-3" aria-labelledby="buy-fabric-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="buy-fabric-heading" className="font-semibold">
          Buy fabric for this pattern
        </h3>
        {requirements.sizes.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your size</span>
            <select
              value={sizeIndex}
              onChange={e => setSizeIndex(Number(e.target.value))}
              className="h-8 rounded-md border bg-transparent px-2 text-sm"
            >
              {requirements.sizes.map((s, i) => (
                <option key={i} value={i}>
                  {s.label} ({formatYardage(s.yards)})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of our in-stock fabrics are a match for this size right now.{' '}
          <Link href="/fabric" className="underline underline-offset-4">
            Browse all fabric
          </Link>
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {suggestions.map(({ fabric, yards, total }) => {
            const already = inCart(fabric.baseSku);
            return (
              <li key={fabric.baseSku} className="flex gap-3 rounded-lg border p-3">
                <Link href={`/fabric/${encodeURIComponent(fabric.baseSku)}`} className="shrink-0">
                  {fabric.photoUrl ? (
                    <img src={fabric.photoUrl} alt={fabric.name} className="h-20 w-20 rounded-md object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-md bg-muted" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={`/fabric/${encodeURIComponent(fabric.baseSku)}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {fabric.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[fabric.weave, fabric.fiber, fabric.widthInches ? `${fabric.widthInches}" wide` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-sm">
                    <strong>{formatYardage(yards)}</strong> · {formatCents(Math.round(total * 100))}
                  </p>
                  {already >= yards ? (
                    <Link href="/cart" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" /> In your cart · View cart
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        add(
                          {
                            baseSku: fabric.baseSku,
                            name: fabric.name,
                            yards: yards - already,
                            pricePerYard: fabric.pricePerYard,
                            photoUrl: fabric.photoUrl,
                          },
                          fabric.maxCut
                        )
                      }
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Add {formatYardage(yards)} to cart
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Yardage is adjusted for each fabric&apos;s width and rounded up to the nearest ¼ yd. Allow a
        little extra for matching stripes, plaids, or one-way prints.
      </p>
    </section>
  );
}
