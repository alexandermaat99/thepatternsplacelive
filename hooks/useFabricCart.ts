'use client';

import { useCallback, useEffect, useState } from 'react';
import { FABRIC_ORDER_SETTINGS, roundYards, type FabricCartItem } from '@/lib/fabric-orders';

const STORAGE_KEY = 'fabric-cart';
const CHANGE_EVENT = 'fabric-cart-change';

function read(): FabricCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: FabricCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Fabric cart, kept in localStorage and synced across components and tabs.
 * Separate from the pattern cart: fabric is our own inventory (not a Connect
 * sale), needs shipping, and is priced per yard.
 */
export function useFabricCart() {
  const [items, setItems] = useState<FabricCartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  /** Adds yards (merging with an existing line for the same fabric). */
  const add = useCallback((item: FabricCartItem, maxYards: number) => {
    const current = read();
    const existing = current.find(i => i.baseSku === item.baseSku);
    if (existing) {
      existing.yards = roundYards(Math.min(existing.yards + item.yards, maxYards));
      existing.pricePerYard = item.pricePerYard;
    } else {
      if (current.length >= FABRIC_ORDER_SETTINGS.maxLines) return false;
      current.push({ ...item, yards: roundYards(item.yards) });
    }
    write(current);
    return true;
  }, []);

  const setYards = useCallback((baseSku: string, yards: number) => {
    write(read().map(i => (i.baseSku === baseSku ? { ...i, yards: roundYards(yards) } : i)));
  }, []);

  const remove = useCallback((baseSku: string) => {
    write(read().filter(i => i.baseSku !== baseSku));
  }, []);

  const clear = useCallback(() => write([]), []);

  const totalYards = items.reduce((sum, i) => sum + i.yards, 0);
  return { items, ready, add, setYards, remove, clear, count: items.length, totalYards };
}
