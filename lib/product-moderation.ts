import { createClient } from '@/lib/supabase/server';

export type ProductModeration = { product_id: string; reason: string; hidden_at: string };

/**
 * Moderation records for the given products. The table is admin-only (RLS),
 * so this returns an empty map for everyone else. No separate admin check
 * is needed, and sellers never learn their listing is hidden.
 */
export async function getProductModeration(
  productIds: string[]
): Promise<Map<string, ProductModeration>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_moderation')
    .select('product_id, reason, hidden_at')
    .in('product_id', productIds);
  if (error) return new Map(); // e.g. table not created yet
  return new Map((data ?? []).map(row => [row.product_id, row]));
}
