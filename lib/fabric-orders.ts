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
  shipping: {
    enabled: true,
    /** Flat-rate US shipping. */
    flatRateCents: 800,
    /** Free shipping when the fabric subtotal reaches this (null = never). */
    freeOverCents: 10000 as number | null,
    estimate: 'Ships in 2–4 business days',
  },
  pickup: {
    enabled: true,
    area: 'Utah Valley',
    instructions: "We'll email you within 1–2 business days to arrange pickup.",
  },
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

export function shippingCentsFor(fulfillment: Fulfillment, subtotalCents: number): number {
  if (fulfillment === 'pickup') return 0;
  const { flatRateCents, freeOverCents } = FABRIC_ORDER_SETTINGS.shipping;
  if (freeOverCents != null && subtotalCents >= freeOverCents) return 0;
  return flatRateCents;
}

export function formatYardsLabel(yards: number): string {
  return `${+yards.toFixed(2)} yd`;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
