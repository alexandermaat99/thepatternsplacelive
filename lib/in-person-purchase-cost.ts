import { boltSkuCandidatesForBase, parseFabricSku } from '@/lib/fabric-sku';

export type SaleLineSnapshot = {
  sku?: string;
  yards?: number;
  line_cost?: number | null;
  buy_price_per_yard?: number | null;
  custom?: boolean;
};

export type PurchaseCostProfit = {
  cost: number | null;
  profit: number | null;
  error: string | null;
};

/** Build lookup keys for fabric rows (sold SKU + all bolts in the same family). */
export function expandSkusForBuyPriceLookup(skus: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const sku of skus) {
    const trimmed = String(sku ?? '').trim();
    if (!trimmed) continue;
    out.add(trimmed);
    const parsed = parseFabricSku(trimmed);
    if (parsed.ok) {
      for (const candidate of boltSkuCandidatesForBase(parsed.baseSku)) {
        out.add(candidate);
      }
    }
  }
  return [...out];
}

export function buyPriceMapFromFabricRows(
  rows: Array<{ sku: string; buy_price: number | null }>
): Map<string, number | null> {
  return new Map(rows.map(r => [r.sku, r.buy_price]));
}

/** Resolve buy price for a sold SKU; falls back to another bolt in the same fabric family. */
export function resolveBuyPricePerYard(
  sku: string,
  buyPriceBySku: Map<string, number | null>
): number | null {
  const trimmed = sku.trim();
  if (!trimmed) return null;

  const direct = buyPriceBySku.get(trimmed);
  if (direct != null && Number.isFinite(Number(direct))) {
    return Number(direct);
  }

  const parsed = parseFabricSku(trimmed);
  if (!parsed.ok) return null;

  for (const candidate of boltSkuCandidatesForBase(parsed.baseSku)) {
    const value = buyPriceBySku.get(candidate);
    if (value != null && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

export function computeCostProfitFromSaleLines(
  saleLines: SaleLineSnapshot[],
  totalAmount: number,
  buyPriceBySku: Map<string, number | null>
): PurchaseCostProfit {
  if (saleLines.length === 0) {
    return { cost: null, profit: null, error: 'Unable to calculate, need buy price.' };
  }

  let cost = 0;
  for (const line of saleLines) {
    const sku = String(line?.sku ?? '').trim();
    const yards = Number(line?.yards);
    if (!Number.isFinite(yards) || yards <= 0) continue;

    if (line?.line_cost != null && Number.isFinite(Number(line.line_cost))) {
      cost += Number(line.line_cost);
      continue;
    }

    // Custom / one-off lines have no inventory buy price.
    if (!sku || sku.startsWith('CUSTOM') || line?.custom) {
      continue;
    }

    if (line?.buy_price_per_yard != null && Number.isFinite(Number(line.buy_price_per_yard))) {
      cost += Number(line.buy_price_per_yard) * yards;
      continue;
    }

    const buy = resolveBuyPricePerYard(sku, buyPriceBySku);
    if (buy == null) {
      return { cost: null, profit: null, error: 'Unable to calculate, need buy price.' };
    }
    cost += buy * yards;
  }

  const profit = Number.isFinite(totalAmount) ? totalAmount - cost : null;
  return { cost, profit, error: null };
}

export function getPurchaseCostProfit(input: {
  cost_amount?: number | null;
  profit_amount?: number | null;
  profit_calculation_error?: string | null;
  total_amount: number;
  sale_lines?: SaleLineSnapshot[] | null;
  sku?: string;
  quantity?: number;
  buyPriceBySku?: Map<string, number | null>;
}): PurchaseCostProfit {
  const buyPriceBySku = input.buyPriceBySku ?? new Map();

  const rawLines = Array.isArray(input.sale_lines) ? input.sale_lines : [];
  const saleLines: SaleLineSnapshot[] =
    rawLines.length > 0
      ? rawLines
      : input.sku
        ? [{ sku: input.sku, yards: Number(input.quantity) }]
        : [];

  if (input.cost_amount != null && Number.isFinite(Number(input.cost_amount))) {
    const cost = Number(input.cost_amount);
    const profit =
      input.profit_amount != null && Number.isFinite(Number(input.profit_amount))
        ? Number(input.profit_amount)
        : Number.isFinite(Number(input.total_amount))
          ? Number(input.total_amount) - cost
          : null;
    return { cost, profit, error: null };
  }

  const fromLines = computeCostProfitFromSaleLines(
    saleLines,
    Number(input.total_amount),
    buyPriceBySku
  );
  if (fromLines.cost != null) {
    return fromLines;
  }

  if (input.profit_calculation_error) {
    return { cost: null, profit: null, error: input.profit_calculation_error };
  }

  return fromLines;
}
