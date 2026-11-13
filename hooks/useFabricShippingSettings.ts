'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FABRIC_SHIPPING, type FabricShippingSettings } from '@/lib/fabric-orders';

let cached: FabricShippingSettings | null = null;
let inflight: Promise<FabricShippingSettings> | null = null;

/** Shipping/pickup options for client components (fetched once per page load). */
export function useFabricShippingSettings(): FabricShippingSettings {
  const [settings, setSettings] = useState<FabricShippingSettings>(cached ?? DEFAULT_FABRIC_SHIPPING);
  useEffect(() => {
    if (cached) return setSettings(cached);
    inflight ??= fetch('/api/fabric/settings')
      .then(r => (r.ok ? r.json() : DEFAULT_FABRIC_SHIPPING))
      .catch(() => DEFAULT_FABRIC_SHIPPING);
    inflight.then(s => {
      cached = s;
      setSettings(s);
    });
  }, []);
  return settings;
}
