'use client';

import { useState } from 'react';

/**
 * Opens the seller's Stripe Express dashboard in a new tab.
 * The tab is opened synchronously on click (so popup blockers allow it) and
 * pointed at the one-time login link once the server returns it.
 */
export function useStripeDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setError(null);
    setIsLoading(true);
    const tab = window.open('', '_blank');

    try {
      const response = await fetch('/api/stripe-dashboard', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not open Stripe');
      }

      if (tab) {
        tab.opener = null;
        tab.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      tab?.close();
      console.error('Error opening Stripe dashboard:', err);
      setError("We couldn't open your payout dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return { open, isLoading, error };
}
