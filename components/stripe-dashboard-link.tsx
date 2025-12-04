'use client';

import { useState } from 'react';
import { ArrowUpRight, Loader2, DollarSign } from 'lucide-react';

export function StripeDashboardLink() {
  const [isLoading, setIsLoading] = useState(false);

  const openStripeDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe-dashboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        // Open Stripe dashboard in new tab
        window.open(data.url, '_blank');
      } else {
        console.error('Failed to get Stripe dashboard URL:', data.error);
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={openStripeDashboard}
      disabled={isLoading}
      className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        ) : (
          <DollarSign className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="font-medium">Stripe Dashboard</span>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

