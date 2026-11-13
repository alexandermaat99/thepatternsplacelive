'use client';

/**
 * Remembers an in-progress checkout that is holding fabric, so the cart can
 * offer "Return to checkout" / "Cancel it" when the shopper comes back
 * without paying (e.g. via the browser's back button).
 */
const KEY = 'pending-checkout';

export type PendingCheckout = { fabricOrderId: string; url: string; expiresAt: number };

export function savePendingCheckout(p: PendingCheckout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function getPendingCheckout(): PendingCheckout | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null') as PendingCheckout | null;
    if (!p || p.expiresAt < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Releases the held fabric (expires the Stripe session) and forgets it. */
export async function cancelPendingCheckout(p: PendingCheckout | null = getPendingCheckout()) {
  clearPendingCheckout();
  if (!p) return;
  await fetch(`/api/fabric/orders/${encodeURIComponent(p.fabricOrderId)}/abandon`, { method: 'POST' }).catch(
    () => {}
  );
}
