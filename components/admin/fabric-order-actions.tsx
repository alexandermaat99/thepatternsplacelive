'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FabricOrderActions({
  orderId,
  fulfillment,
  canFulfill,
  canCancel,
  paid,
}: {
  orderId: string;
  fulfillment: 'ship' | 'pickup';
  canFulfill: boolean;
  canCancel: boolean;
  paid: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/fabric-orders/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, tracking }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return showToast(data.error || 'Something went wrong', 'error');
    showToast('Updated', 'success');
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canFulfill && fulfillment === 'ship' && (
        <>
          <Input
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            placeholder="Tracking number (optional)"
            className="h-9 w-56"
          />
          <Button size="sm" onClick={() => run('shipped')} disabled={busy}>
            Mark shipped + email customer
          </Button>
        </>
      )}
      {canFulfill && fulfillment === 'pickup' && (
        <Button size="sm" onClick={() => run('picked_up')} disabled={busy}>
          Mark picked up
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            run(
              'cancel',
              paid
                ? 'Cancel this order and put the yardage back in stock? This does NOT refund the customer. Refund them in Stripe afterwards.'
                : 'Cancel this order and put the yardage back in stock?'
            )
          }
        >
          Cancel & restock
        </Button>
      )}
    </div>
  );
}
