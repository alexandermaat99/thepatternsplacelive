import { cache } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  boltSkuCandidatesForBase,
  formatBoltLabel,
  parseFabricSku,
} from '@/lib/fabric-sku';

/** Public catalog fields only (no cost or internal notes). */
export type FabricCatalogRow = {
  /** Base SKU — one card per fabric, even when multiple bolts exist. */
  sku: string;
  name: string | null;
  sell_price: number | null;
  photo_url: string | null;
  /** Total yards across all bolts for this base SKU. */
  current_quantity: number | null;
  boltCount: number;
};

type FabricRowRaw = {
  sku: string;
  name: string | null;
  sell_price: number | null;
  photo_url: string | null;
  current_quantity: number | null;
};

type FabricDetailRowRaw = FabricRowRaw & {
  description: string | null;
  weave: string | null;
  fiber: string | null;
  width: number | null;
};

/** Public detail view (excludes buy_price / purchase_quantity). */
export type FabricPublicDetail = {
  sku: string;
  name: string | null;
  description: string | null;
  weave: string | null;
  fiber: string | null;
  width: number | null;
  sell_price: number | null;
  /** First image (grid / legacy). */
  photo_url: string | null;
  /** Ordered gallery for detail carousel; falls back to legacy bolt photo_url when empty. */
  photo_urls: string[];
  /** Total yards across all bolts. */
  current_quantity: number | null;
  boltCount: number;
  /** Per-bolt yardage when more than one bolt exists. */
  bolts: { sku: string; label: string; current_quantity: number | null }[];
};

function groupFabricRowsForCatalog(rows: FabricRowRaw[]): FabricCatalogRow[] {
  const groups = new Map<string, FabricRowRaw[]>();

  for (const row of rows) {
    const parsed = parseFabricSku(row.sku);
    const baseSku = parsed.ok ? parsed.baseSku : row.sku;
    const existing = groups.get(baseSku) || [];
    existing.push(row);
    groups.set(baseSku, existing);
  }

  const result: FabricCatalogRow[] = Array.from(groups.entries()).map(([baseSku, bolts]) => {
    const sortedBolts = [...bolts].sort((a, b) => {
      const pa = parseFabricSku(a.sku);
      const pb = parseFabricSku(b.sku);
      const boltA = pa.ok ? pa.boltIndex : 0;
      const boltB = pb.ok ? pb.boltIndex : 0;
      return boltA - boltB;
    });

    let yardageTotal = 0;
    let hasAnyQuantity = false;
    for (const b of sortedBolts) {
      if (b.current_quantity != null && Number.isFinite(Number(b.current_quantity))) {
        hasAnyQuantity = true;
        yardageTotal += Number(b.current_quantity);
      }
    }

    const representative = [...sortedBolts].sort((a, b) => {
      const aPhoto = a.photo_url ? 1 : 0;
      const bPhoto = b.photo_url ? 1 : 0;
      if (bPhoto !== aPhoto) return bPhoto - aPhoto;
      const aQty = a.current_quantity ?? -Infinity;
      const bQty = b.current_quantity ?? -Infinity;
      return bQty - aQty;
    })[0];

    const photo_url =
      representative?.photo_url ?? sortedBolts.find(b => b.photo_url)?.photo_url ?? null;
    const name = representative?.name ?? sortedBolts.find(b => b.name)?.name ?? null;
    const sell_price =
      representative?.sell_price ??
      sortedBolts.find(b => b.sell_price != null)?.sell_price ??
      null;

    return {
      sku: baseSku,
      name,
      sell_price: sell_price != null ? Number(sell_price) : null,
      photo_url,
      current_quantity: hasAnyQuantity ? yardageTotal : null,
      boltCount: sortedBolts.length,
    };
  });

  result.sort((a, b) => {
    const na = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    if (na !== 0) return na;
    return a.sku.localeCompare(b.sku);
  });

  return result;
}

function pickRepresentativeBolt(rows: FabricDetailRowRaw[]): FabricDetailRowRaw {
  const sorted = [...rows].sort((a, b) => {
    const pa = parseFabricSku(a.sku);
    const pb = parseFabricSku(b.sku);
    const boltA = pa.ok ? pa.boltIndex : 0;
    const boltB = pb.ok ? pb.boltIndex : 0;
    return boltA - boltB;
  });
  return [...sorted].sort((a, b) => {
    const aPhoto = a.photo_url ? 1 : 0;
    const bPhoto = b.photo_url ? 1 : 0;
    if (bPhoto !== aPhoto) return bPhoto - aPhoto;
    const aQty = a.current_quantity ?? -Infinity;
    const bQty = b.current_quantity ?? -Infinity;
    return bQty - aQty;
  })[0];
}

/**
 * Server-only: fetch fabric rows for the public catalog. Uses service role to
 * read inventory (RLS restricts direct anon access to `fabric`).
 */
export async function getFabricCatalogRows(): Promise<FabricCatalogRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('fabric')
    .select('sku, name, sell_price, photo_url, current_quantity')
    .order('name', { ascending: true, nullsFirst: false })
    .order('sku', { ascending: true });

  if (error) {
    console.error('Error fetching fabric catalog:', error);
    return [];
  }

  const grouped = groupFabricRowsForCatalog((data ?? []) as FabricRowRaw[]);
  const baseSkus = grouped.map(g => g.sku);
  if (baseSkus.length === 0) return [];

  const { data: photoRows, error: photoErr } = await supabase
    .from('fabric_photos')
    .select('base_sku, photo_url, sort_order')
    .in('base_sku', baseSkus)
    .order('sort_order', { ascending: true });

  if (photoErr) {
    console.error('Error fetching fabric_photos:', photoErr);
  }

  const byBase = new Map<string, string[]>();
  for (const r of photoRows ?? []) {
    const list = byBase.get(r.base_sku) ?? [];
    list.push(r.photo_url);
    byBase.set(r.base_sku, list);
  }

  return grouped.map(g => {
    const gallery = byBase.get(g.sku);
    const photo_url = gallery?.[0] ?? g.photo_url;
    return { ...g, photo_url };
  });
}

/**
 * Server-only: single fabric row for the public detail page.
 * Cached per request so `generateMetadata` and the page share one DB read.
 */
export const getFabricPublicDetail = cache(async function getFabricPublicDetail(
  sku: string
): Promise<FabricPublicDetail | null> {
  const trimmed = sku.trim();
  if (!trimmed) return null;

  const parsed = parseFabricSku(trimmed);
  const baseSku = parsed.ok ? parsed.baseSku : trimmed;

  const supabase = createServiceRoleClient();

  const [{ data, error }, photoResult] = await Promise.all([
    supabase
      .from('fabric')
      .select('sku, name, description, weave, fiber, width, sell_price, photo_url, current_quantity')
      .in('sku', boltSkuCandidatesForBase(baseSku)),
    supabase
      .from('fabric_photos')
      .select('photo_url, sort_order')
      .eq('base_sku', baseSku)
      .order('sort_order', { ascending: true }),
  ]);

  if (error) {
    console.error('Error fetching fabric detail:', error);
    return null;
  }

  if (photoResult.error) {
    console.error('Error fetching fabric_photos:', photoResult.error);
  }

  const rows = (data ?? []) as FabricDetailRowRaw[];
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    const pa = parseFabricSku(a.sku);
    const pb = parseFabricSku(b.sku);
    const boltA = pa.ok ? pa.boltIndex : 0;
    const boltB = pb.ok ? pb.boltIndex : 0;
    return boltA - boltB;
  });

  let yardageTotal = 0;
  let hasAnyQuantity = false;
  for (const b of sorted) {
    if (b.current_quantity != null && Number.isFinite(Number(b.current_quantity))) {
      hasAnyQuantity = true;
      yardageTotal += Number(b.current_quantity);
    }
  }

  const rep = pickRepresentativeBolt(sorted);

  let photo_urls = (photoResult.data ?? []).map(r => r.photo_url);
  if (photo_urls.length === 0) {
    const legacy = rep.photo_url ?? sorted.find(b => b.photo_url)?.photo_url;
    if (legacy) photo_urls = [legacy];
  }

  const bolts = sorted.map(row => {
    const p = parseFabricSku(row.sku);
    const boltIndex = p.ok ? p.boltIndex : 0;
    return {
      sku: row.sku,
      label: formatBoltLabel(boltIndex),
      current_quantity: row.current_quantity,
    };
  });

  return {
    sku: baseSku,
    name: rep.name,
    description: rep.description,
    weave: rep.weave,
    fiber: rep.fiber,
    width: rep.width,
    sell_price: rep.sell_price != null ? Number(rep.sell_price) : null,
    photo_url: photo_urls[0] ?? null,
    photo_urls,
    current_quantity: hasAnyQuantity ? yardageTotal : null,
    boltCount: sorted.length,
    bolts,
  };
});
