/**
 * "Buy fabric for this pattern": which in-stock fabrics suit a pattern, and
 * how much of each to buy. Pure functions (used on the server and client).
 */
import { FABRIC_ORDER_SETTINGS } from '@/lib/fabric-orders';
import type { FabricRequirements } from '@/lib/fabric-requirements';

export type OrderableFabric = {
  baseSku: string;
  name: string;
  weave: string | null;
  fiber: string | null;
  widthInches: number | null;
  pricePerYard: number;
  photoUrl: string | null;
  /** Largest single cut available (largest bolt), in yards. */
  maxCut: number;
};

export type FabricKind = 'woven' | 'knit' | 'specialty';

const KNIT = /\b(knit|ponte|jersey|rib|interlock|french terry|fleece|sweater|spandex|lycra|scuba|stretch|minky)\b/i;
const SPECIALTY = /\b(lace|tulle|mesh|vinyl|organza|sequin|netting|faux fur|leather)\b/i;

export function fabricKind(f: Pick<OrderableFabric, 'name' | 'weave' | 'fiber'>): FabricKind {
  const text = [f.weave, f.fiber, f.name].filter(Boolean).join(' ');
  if (SPECIALTY.test(text)) return 'specialty';
  if (KNIT.test(text)) return 'knit';
  return 'woven';
}

/**
 * Yards of this fabric needed for `patternYards` given at the pattern's
 * width: scaled by width (wider fabric needs less), rounded UP to the cut
 * increment so the buyer is never short.
 */
export function yardsForFabric(patternYards: number, patternWidth: number, fabricWidth: number | null): number {
  const step = FABRIC_ORDER_SETTINGS.stepYards;
  const sameWidth = !fabricWidth || Math.abs(fabricWidth - patternWidth) <= 1;
  const raw = sameWidth ? patternYards : (patternYards * patternWidth) / fabricWidth;
  return Math.max(FABRIC_ORDER_SETTINGS.minYards, Math.ceil(raw / step - 1e-9) * step);
}

export type FabricSuggestion = { fabric: OrderableFabric; yards: number; total: number };

/** Suitable fabrics with enough yardage in one piece, best matches first. */
export function suggestFabrics(
  requirements: FabricRequirements,
  sizeIndex: number,
  fabrics: OrderableFabric[],
  limit = 6
): FabricSuggestion[] {
  const size = requirements.sizes[sizeIndex] ?? requirements.sizes[0];
  if (!size) return [];
  const wanted = requirements.fabricType;
  return fabrics
    .filter(f => {
      const kind = fabricKind(f);
      // Specialty fabrics (lace, tulle, ...) are never auto-suggested.
      return wanted === 'either' ? kind !== 'specialty' : kind === wanted;
    })
    .map(fabric => {
      const yards = yardsForFabric(size.yards, requirements.widthInches, fabric.widthInches);
      return { fabric, yards, total: Math.round(fabric.pricePerYard * yards * 100) / 100 };
    })
    .filter(s => s.yards <= s.fabric.maxCut + 1e-9)
    .sort((a, b) => a.total - b.total)
    .slice(0, limit);
}
