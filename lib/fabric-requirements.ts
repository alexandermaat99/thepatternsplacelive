/**
 * How much fabric a pattern needs, as on a pattern envelope's yardage chart.
 * Stored on products.fabric_requirements (jsonb, optional).
 */
export type FabricType = 'woven' | 'knit' | 'either';
export type FabricWidth = 45 | 60;

export type FabricRequirements = {
  fabricType: FabricType;
  /** e.g. "Cotton poplin, linen, rayon challis" */
  suggested: string;
  /** The yardage below is for fabric of this width (inches). */
  widthInches: FabricWidth;
  /** e.g. [{ label: "XS–M", yards: 2 }, { label: "L–3X", yards: 2.5 }] or [{ label: "All sizes", yards: 1.5 }] */
  sizes: { label: string; yards: number }[];
};

export const FABRIC_TYPE_LABELS: Record<FabricType, string> = {
  woven: 'Woven',
  knit: 'Knit (stretch)',
  either: 'Woven or knit',
};

export const EMPTY_FABRIC_REQUIREMENTS: FabricRequirements = {
  fabricType: 'woven',
  suggested: '',
  widthInches: 45,
  sizes: [{ label: 'All sizes', yards: 0 }],
};

/** Clean up user input. Returns null if no yardage was entered (field is optional). */
export function normalizeFabricRequirements(raw: unknown): FabricRequirements | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FabricRequirements>;
  const sizes = (Array.isArray(r.sizes) ? r.sizes : [])
    .map(s => ({
      label: typeof s?.label === 'string' ? s.label.trim().slice(0, 40) : '',
      yards: typeof s?.yards === 'number' && Number.isFinite(s.yards) ? Math.round(s.yards * 8) / 8 : 0,
    }))
    .filter(s => s.yards > 0 && s.yards <= 30)
    .slice(0, 12);
  sizes.forEach((s, i) => {
    if (!s.label) s.label = sizes.length === 1 ? 'All sizes' : `Size ${i + 1}`;
  });
  if (sizes.length === 0) return null;
  return {
    fabricType: r.fabricType === 'knit' || r.fabricType === 'either' ? r.fabricType : 'woven',
    suggested: typeof r.suggested === 'string' ? r.suggested.trim().slice(0, 200) : '',
    widthInches: r.widthInches === 60 ? 60 : 45,
    sizes,
  };
}

export function formatYardage(yards: number): string {
  const whole = Math.floor(yards);
  const frac = yards - whole;
  const fractions: Record<string, string> = { '0.125': '⅛', '0.25': '¼', '0.375': '⅜', '0.5': '½', '0.625': '⅝', '0.75': '¾', '0.875': '⅞' };
  const f = fractions[String(Math.round(frac * 1000) / 1000)];
  if (!frac) return `${whole} yd`;
  return f ? `${whole ? whole : ''}${f} yd` : `${+yards.toFixed(2)} yd`;
}
