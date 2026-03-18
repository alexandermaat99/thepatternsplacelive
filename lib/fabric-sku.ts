export type FabricSkuParseResult =
  | {
      ok: true;
      baseSku: string; // e.g. PDP001
      boltIndex: number; // 0-based
      normalizedSku: string; // original SKU, trimmed
    }
  | {
      ok: false;
      error: string;
    };

/**
 * SKU format:
 * - Must end with at least 3 digits (fabric number)
 * - May include a 4th digit at the end (bolt index), 0-based
 *   Example: PDP001 (bolt 0), PDP0011 (bolt 1)
 */
export function parseFabricSku(input: string): FabricSkuParseResult {
  const sku = input.trim();
  if (!sku) return { ok: false, error: 'SKU is required' };

  // Capture: prefix + 3 digits + optional 4th digit
  const m = sku.match(/^(.*?)(\d{3})(\d)?$/);
  if (!m) {
    return {
      ok: false,
      error: 'SKU must end with 3 digits (optionally +1 bolt digit). Example: PDP001 or PDP0011.',
    };
  }

  const prefix = m[1] ?? '';
  const three = m[2];
  const boltDigit = m[3]; // optional

  const baseSku = `${prefix}${three}`;
  const boltIndex = boltDigit ? Number(boltDigit) : 0;
  if (!Number.isInteger(boltIndex) || boltIndex < 0) {
    return { ok: false, error: 'Invalid bolt index in SKU.' };
  }

  return { ok: true, baseSku, boltIndex, normalizedSku: sku };
}

export function formatBoltLabel(boltIndex: number) {
  if (boltIndex <= 0) return 'Bolt 1';
  return `Bolt ${boltIndex + 1}`;
}

