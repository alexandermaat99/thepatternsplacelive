'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';

export function UnhideButton({ productId }: { productId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await createClient()
          .from('product_moderation')
          .delete()
          .eq('product_id', productId);
        setBusy(false);
        if (error) return showToast(`Couldn't unhide: ${error.message}`, 'error');
        showToast('Listing visible again', 'success');
        router.refresh();
      }}
    >
      Unhide
    </Button>
  );
}
