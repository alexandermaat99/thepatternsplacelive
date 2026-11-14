'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';

/** Dismiss a flag, or hide the listing (which resolves every open flag on it). */
export function ListingFlagActions({
  flagId,
  productId,
  reason,
  alreadyHidden,
}: {
  flagId: string;
  productId: string;
  reason: string;
  alreadyHidden: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const resolve = async (resolution: string, allForProduct: boolean) => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    let query = supabase
      .from('listing_flags')
      .update({ resolved_at: new Date().toISOString(), resolved_by: auth.user?.id ?? null, resolution })
      .is('resolved_at', null);
    query = allForProduct ? query.eq('product_id', productId) : query.eq('id', flagId);
    return query;
  };

  const dismiss = async () => {
    setBusy(true);
    const { error } = await resolve('dismissed', false);
    setBusy(false);
    if (error) return showToast(`Couldn't dismiss: ${error.message}`, 'error');
    showToast('Dismissed', 'success');
    router.refresh();
  };

  const hide = async () => {
    setBusy(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!alreadyHidden) {
      const { error } = await supabase
        .from('product_moderation')
        .insert({ product_id: productId, reason, hidden_by: auth.user?.id ?? null });
      if (error) {
        setBusy(false);
        return showToast(`Couldn't hide: ${error.message}`, 'error');
      }
    }
    const { error } = await resolve('hidden', true);
    setBusy(false);
    if (error) return showToast(`Hidden, but couldn't close the reports: ${error.message}`, 'error');
    showToast('Listing hidden', 'success');
    router.refresh();
  };

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={dismiss} disabled={busy}>
        Dismiss
      </Button>
      <Button size="sm" variant="destructive" onClick={hide} disabled={busy}>
        {alreadyHidden ? 'Close (already hidden)' : 'Hide listing'}
      </Button>
    </div>
  );
}
