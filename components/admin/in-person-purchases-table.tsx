'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateDisplay } from '@/components/date-display';

export interface InPersonPurchaseRow {
  id: string;
  created_at: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  receipt_email: string;
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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">SKU</th>
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Qty</th>
            <th className="pb-3 font-medium">Total</th>
            <th className="pb-3 font-medium">Receipt Email</th>
            <th className="pb-3 font-medium">Inventory</th>
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
              <td className="py-3 text-muted-foreground">
                <DateDisplay date={p.created_at} />
              </td>
              <td className="py-3 font-medium">{p.sku}</td>
              <td className="py-3 font-medium">{p.name}</td>
              <td className="py-3 text-muted-foreground">{p.quantity}</td>
              <td className="py-3 font-medium">{formatCurrency(p.total_amount)}</td>
              <td className="py-3">
                <div className="max-w-[240px] truncate">{p.receipt_email}</div>
              </td>
              <td className="py-3 text-muted-foreground">
                {p.inventory_before} → {p.inventory_after}
                {p.reversed && p.reversed_at ? (
                  <div className="text-xs text-rose-600 mt-1">
                    Reversed ({new Date(p.reversed_at).toLocaleString()})
                  </div>
                ) : null}
              </td>
              <td className="py-3">
                {p.email_sent ? (
                  <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                    Sent
                  </span>
                ) : p.email_error ? (
                  <span className="inline-flex items-center text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded">
                    Error
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    Not sent
                  </span>
                )}
              </td>
              <td className="py-3 text-right">
                <button
                  type="button"
                  disabled={p.reversed || reversingId === p.id}
                  onClick={() => handleReverse(p.id)}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-rose-600 text-white hover:bg-rose-700 h-8 px-3"
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
