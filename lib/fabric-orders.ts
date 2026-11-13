/**
 * Online fabric ordering: settings and shared helpers.
 * All money is in cents; all lengths are in yards.
 */

export const FABRIC_ORDER_SETTINGS = {
  /** Smallest cut we sell. */
  minYards: 0.5,
  /** Cuts are sold in these increments. */
  stepYards: 0.25,
  /** Largest single cut per line (also capped by the largest bolt). */
  maxYardsPerLine: 20,
  /** Most different fabrics in one order. */
  maxLines: 20,
  /** Stock is held this long while the customer is in Stripe checkout (Stripe minimum: 30). */
  holdMinutes: 30,
  /** Stripe Tax code for general tangible goods. */
  stripeTaxCode: 'txcd_99999999',
} as const;

export type FabricCartItem = {
  baseSku: string;
  name: string;
  yards: number;
  pricePerYard: number; // dollars, for display only. The server reprices from the database.
  photoUrl: string | null;
};

export type Fulfillment = 'ship' | 'pickup';

/** Round to the cut increment (avoids float drift like 1.7500000001). */
export function roundYards(yards: number): number {
  const step = FABRIC_ORDER_SETTINGS.stepYards;
  return Math.round(yards / step) * step;
}

export function isValidCut(yards: number, maxYards: number): boolean {
  const { minYards, stepYards, maxYardsPerLine } = FABRIC_ORDER_SETTINGS;
  if (!Number.isFinite(yards)) return false;
  const onStep = Math.abs(yards / stepYards - Math.round(yards / stepYards)) < 1e-9;
  return onStep && yards >= minYards && yards <= Math.min(maxYards, maxYardsPerLine);
}

/** Largest single cut available: one cut always comes from one bolt. */
export function largestBoltYards(bolts: { current_quantity: number | null }[]): number {
  return bolts.reduce((max, b) => Math.max(max, Number(b.current_quantity) || 0), 0);
}

/** Largest valid cut, rounded down to the increment. */
export function maxOrderableYards(bolts: { current_quantity: number | null }[]): number {
  const step = FABRIC_ORDER_SETTINGS.stepYards;
  const max = Math.min(largestBoltYards(bolts), FABRIC_ORDER_SETTINGS.maxYardsPerLine);
  return Math.floor(max / step + 1e-9) * step;
}

/**
 * Shipping and pickup options. Editable by admins (Admin → Fabric settings,
 * stored in site_settings under "fabric_shipping"); these are the defaults.
 */
export type ShippingTier = { upToYards: number | null; cents: number };
export type FabricShippingSettings = {
  shipping: {
    enabled: boolean;
    /** Price by total fabric yards in the order. Sorted ascending; the last tier (upToYards null) covers everything above. */
    tiers: ShippingTier[];
    /** Free shipping when the fabric subtotal reaches this (null = never). */
    freeOverCents: number | null;
    estimate: string;
  };
  pickup: { enabled: boolean; area: string; instructions: string };
};

export const DEFAULT_FABRIC_SHIPPING: FabricShippingSettings = {
  shipping: {
    enabled: true,
    tiers: [{ upToYards: null, cents: 800 }],
    freeOverCents: 10000,
    estimate: 'Ships in 2–4 business days',
  },
  pickup: {
    enabled: true,
    area: 'Utah Valley',
    instructions: "We'll email you within 1–2 business days to arrange pickup.",
  },
};

/** Coerce stored/admin-submitted settings into a valid shape (falls back to defaults). */
export function normalizeShippingSettings(raw: unknown): FabricShippingSettings {
  const d = DEFAULT_FABRIC_SHIPPING;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<FabricShippingSettings>;
  const cents = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;
  const text = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : fallback;

  const rawTiers = Array.isArray(r.shipping?.tiers) ? r.shipping!.tiers : d.shipping.tiers;
  let tiers = rawTiers
    .map(t => ({
      upToYards:
        typeof t?.upToYards === 'number' && Number.isFinite(t.upToYards) && t.upToYards > 0 ? t.upToYards : null,
      cents: cents(t?.cents, 0),
    }))
    .slice(0, 10);
  // Bounded tiers ascending, then exactly one open-ended tier last.
  const bounded = tiers.filter(t => t.upToYards != null).sort((a, b) => a.upToYards! - b.upToYards!);
  const open = tiers.find(t => t.upToYards == null) ?? (bounded.length ? { upToYards: null, cents: bounded[bounded.length - 1].cents } : d.shipping.tiers[0]);
  tiers = [...bounded, open];

  const free = r.shipping?.freeOverCents;
  return {
    shipping: {
      enabled: typeof r.shipping?.enabled === 'boolean' ? r.shipping.enabled : d.shipping.enabled,
      tiers,
      freeOverCents: free === null ? null : cents(free, d.shipping.freeOverCents ?? 0),
      estimate: text(r.shipping?.estimate, d.shipping.estimate),
    },
    pickup: {
      enabled: typeof r.pickup?.enabled === 'boolean' ? r.pickup.enabled : d.pickup.enabled,
      area: text(r.pickup?.area, d.pickup.area),
      instructions: text(r.pickup?.instructions, d.pickup.instructions),
    },
  };
}

export function shippingCentsFor(
  settings: FabricShippingSettings,
  fulfillment: Fulfillment,
  subtotalCents: number,
  totalYards: number
): number {
  if (fulfillment === 'pickup') return 0;
  const { tiers, freeOverCents } = settings.shipping;
  if (freeOverCents != null && subtotalCents >= freeOverCents) return 0;
  const tier = tiers.find(t => t.upToYards == null || totalYards <= t.upToYards + 1e-9) ?? tiers[tiers.length - 1];
  return tier.cents;
}

/** One-line description, e.g. "US shipping $8 flat, free over $100" or "US shipping from $8 ($8 up to 3 yd, $12 over 3 yd)". */
export function describeShipping(settings: FabricShippingSettings): string {
  const { tiers, freeOverCents } = settings.shipping;
  const free = freeOverCents != null ? `, free over ${formatCents(freeOverCents)}` : '';
  if (tiers.length === 1) return `US shipping ${formatCents(tiers[0].cents)} flat${free}`;
  const parts = tiers.map((t, i) =>
    t.upToYards != null
      ? `${formatCents(t.cents)} up to ${+t.upToYards.toFixed(2)} yd`
      : `${formatCents(t.cents)} over ${+(tiers[i - 1]?.upToYards ?? 0).toFixed(2)} yd`
  );
  return `US shipping from ${formatCents(Math.min(...tiers.map(t => t.cents)))} (${parts.join(', ')})${free}`;
}

export function formatYardsLabel(yards: number): string {
  return `${+yards.toFixed(2)} yd`;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
