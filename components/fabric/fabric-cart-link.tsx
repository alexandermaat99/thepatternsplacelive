'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useFabricCart } from '@/hooks/useFabricCart';
import { formatYardsLabel } from '@/lib/fabric-orders';

/** "Your fabric order" link, shown when the fabric cart isn't empty. */
export function FabricCartLink() {
  const { count, totalYards, ready } = useFabricCart();
  if (!ready || count === 0) return null;
  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
    >
      <ShoppingBag className="h-4 w-4" />
      In your cart: {count} {count === 1 ? 'fabric' : 'fabrics'}, {formatYardsLabel(totalYards)}
    </Link>
  );
}
