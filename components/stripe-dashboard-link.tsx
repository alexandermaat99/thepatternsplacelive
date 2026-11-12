'use client';

import { ArrowUpRight, Loader2, DollarSign } from 'lucide-react';
import { useStripeDashboard } from '@/hooks/useStripeDashboard';

export function StripeDashboardLink() {
  const { open, isLoading, error } = useStripeDashboard();

  return (
    <div>
      <button
        onClick={open}
        disabled={isLoading}
        className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-medium">Payouts &amp; Tax Forms</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
