import { NextResponse } from 'next/server';

/**
 * Retired: the old single-pattern checkout. Everything goes through
 * /api/checkout/cart now (one checkout for patterns from any designers, plus
 * fabric). Kept as a stub so stale clients get a clear message.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Checkout has moved. Please refresh the page and check out from your cart.' },
    { status: 410 }
  );
}
