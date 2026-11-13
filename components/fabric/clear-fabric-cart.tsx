'use client';

import { useEffect } from 'react';
import { useFabricCart } from '@/hooks/useFabricCart';

/** Empties the fabric cart once an order is placed. */
export function ClearFabricCart() {
  const { clear, ready } = useFabricCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
