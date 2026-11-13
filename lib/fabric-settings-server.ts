import { cache } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { DEFAULT_FABRIC_SHIPPING, normalizeShippingSettings, type FabricShippingSettings } from '@/lib/fabric-orders';

export const FABRIC_SHIPPING_KEY = 'fabric_shipping';

/** Current shipping/pickup settings (admin-edited), falling back to defaults. Cached per request. */
export const getFabricShippingSettings = cache(async (): Promise<FabricShippingSettings> => {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('site_settings')
      .select('value')
      .eq('key', FABRIC_SHIPPING_KEY)
      .maybeSingle();
    if (error || !data) return DEFAULT_FABRIC_SHIPPING;
    return normalizeShippingSettings(data.value);
  } catch {
    return DEFAULT_FABRIC_SHIPPING;
  }
});
