'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// DateDisplay is intentionally not used here; admin table uses a tighter short date format.

export interface InPersonPurchaseRow {
  id: string;
  created_at: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  receipt_email: string;
  payment_method?: string | null;
  inventory_before: number;
  inventory_after: number;
  email_sent: boolean;
  email_error: string | null;
  reversed: boolean;
  reversed_at: string | null;
  name: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}

export function InPersonPurchasesTable({ purchases }: { purchases: InPersonPurchaseRow[] }) {
  const router = useRouter();
  const [reversingId, setReversingId] = useState<string | null>(null);

  const formatShortDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d);
    } catch {
      return iso;
    }
  };

  const handleReverse = async (purchaseId: string) => {
    const ok = window.confirm(
      'Reverse this in-person sale? Inventory will be restored if it still matches.'
    );
    if (!ok) return;

    try {
      setReversingId(purchaseId);
      const res = await fetch('/api/fabric/reverse-in-person-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reverse sale');
      }

      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to reverse sale');
    } finally {
      setReversingId(null);
    }
  };

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No in-person purchases yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] sm:text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">SKU</th>
            <th className="pb-3 font-medium hidden sm:table-cell">Name</th>
            <th className="pb-3 font-medium">Qty</th>
            <th className="pb-3 font-medium">Total</th>
            <th className="pb-3 font-medium hidden sm:table-cell">Payment</th>
            <th className="pb-3 font-medium hidden md:table-cell">Receipt Email</th>
            <th className="pb-3 font-medium hidden md:table-cell">Inventory</th>
            <th className="pb-3 font-medium">Receipt</th>
            <th className="pb-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {purchases.map(p => (
            <tr
              key={p.id}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors align-top"
            >
              <td className="py-2 text-muted-foreground whitespace-nowrap">{formatShortDate(p.created_at)}</td>
              <td className="py-2 font-medium whitespace-nowrap">{p.sku}</td>
              <td className="py-2 font-medium hidden sm:table-cell">{p.name}</td>
              <td className="py-2 text-muted-foreground whitespace-nowrap">{p.quantity}</td>
              <td className="py-2 font-medium whitespace-nowrap">{formatCurrency(p.total_amount)}</td>
              <td className="py-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                {p.payment_method ? p.payment_method.toUpperCase() : '—'}
              </td>
              <td className="py-2 hidden md:table-cell">
                <div className="max-w-[220px] truncate">{p.receipt_email}</div>
              </td>
              <td className="py-2 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                {p.inventory_before} → {p.inventory_after}
                {p.reversed && p.reversed_at ? (
                  <div className="text-[10px] text-rose-600 mt-1">
                    Reversed ({new Date(p.reversed_at).toLocaleDateString()})
                  </div>
                ) : null}
              </td>
              <td className="py-2 whitespace-nowrap">
                {p.email_sent ? (
                  <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                    Sent
                  </span>
                ) : p.email_error ? (
                  <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    Error
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Not sent
                  </span>
                )}
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  disabled={p.reversed || reversingId === p.id}
                  onClick={() => handleReverse(p.id)}
                  className="inline-flex items-center justify-center rounded-md text-[11px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-rose-600 text-white hover:bg-rose-700 h-7 px-2.5"
                >
                  {p.reversed ? 'Reversed' : reversingId === p.id ? 'Reversing…' : 'Reverse'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
