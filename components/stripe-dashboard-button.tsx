'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useStripeDashboard } from '@/hooks/useStripeDashboard';

export function StripeDashboardButton() {
  const { open, isLoading, error } = useStripeDashboard();

  return (
    <div>
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={open}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4 mr-2" />
        )}
        Payouts &amp; Tax Forms
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
