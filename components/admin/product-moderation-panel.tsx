'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Eye, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const QUICK_REASONS = [
  'AI-generated pattern',
  'Service, not a pattern',
  'Copyright / not the seller’s to sell',
  'Spam or low quality',
  'Misleading listing',
];

/**
 * Admin-only control (rendered only for admins) to shadow-hide a listing.
 * Hidden listings still look normal to the seller; everyone else can't see them.
 */
export function ProductModerationPanel({
  productId,
  hidden,
}: {
  productId: string;
  hidden: { reason: string; hidden_at: string } | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const hide = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('product_moderation')
      .insert({ product_id: productId, reason: reason.trim(), hidden_by: auth.user?.id ?? null });
    setBusy(false);
    if (error) return showToast(`Couldn't hide: ${error.message}`, 'error');
    showToast('Listing hidden', 'success');
    setOpen(false);
    router.refresh();
  };

  const unhide = async () => {
    setBusy(true);
    const { error } = await createClient()
      .from('product_moderation')
      .delete()
      .eq('product_id', productId);
    setBusy(false);
    if (error) return showToast(`Couldn't unhide: ${error.message}`, 'error');
    showToast('Listing visible again', 'success');
    router.refresh();
  };

  if (hidden) {
    return (
      <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Hidden by an admin</p>
            <p>Reason: {hidden.reason}</p>
            <p className="text-xs opacity-80">
              Hidden {new Date(hidden.hidden_at).toLocaleDateString()}. Only the seller, admins, and
              past buyers can see this listing. It looks normal to the seller, and this notice is
              admin-only.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={unhide} disabled={busy}>
            <Eye className="h-4 w-4 mr-1.5" />
            Unhide
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed p-3 text-sm">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Admin</span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <EyeOff className="h-4 w-4 mr-1.5" />
            Hide listing
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-medium">Hide this listing</p>
          <p className="text-xs text-muted-foreground">
            It will disappear for everyone except the seller (who will still see it as listed),
            admins, and past buyers. The reason is only visible to admins.
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (required)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={hide} disabled={busy || !reason.trim()}>
              Hide listing
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
