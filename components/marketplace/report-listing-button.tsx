'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REPORT_REASONS, type ReportReason } from '@/lib/listing-flags';

/** "Report this listing": sends a report to the admin review queue. */
export function ReportListingButton({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    const res = await fetch('/api/listings/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, reason, detail, email: user ? undefined : email }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return showToast(data.error || 'Could not send your report.', 'error');
    setSent(true);
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setReason(null);
      setDetail('');
      setSent(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        <Flag className="h-3.5 w-3.5" /> Report this listing
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          {sent ? (
            <>
              <DialogHeader>
                <DialogTitle>Thanks for letting us know</DialogTitle>
                <DialogDescription>
                  A person on our team will review this listing. We don&apos;t share who reported it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => close(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report this listing</DialogTitle>
                <DialogDescription>
                  Reports go to a person on our team, not an automatic filter. The designer won&apos;t
                  see who reported it.
                </DialogDescription>
              </DialogHeader>
              <fieldset className="space-y-2">
                <legend className="sr-only">Reason</legend>
                {REPORT_REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-muted">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    {r}
                  </label>
                ))}
              </fieldset>
              <div className="space-y-1">
                <Label htmlFor="report-detail">
                  Details {reason === 'Something else' ? '' : '(optional)'}
                </Label>
                <Textarea
                  id="report-detail"
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={
                    reason === 'Copied or stolen design'
                      ? 'Link to the original, if you have it'
                      : 'Anything that helps us review it'
                  }
                />
              </div>
              {!user && (
                <div className="space-y-1">
                  <Label htmlFor="report-email">Your email (optional, if you want a reply)</Label>
                  <Input id="report-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => close(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={!reason || sending || (reason === 'Something else' && !detail.trim())}
                >
                  {sending ? 'Sending…' : 'Send report'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
