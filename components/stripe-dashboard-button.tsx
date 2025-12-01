'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';

export function StripeDashboardButton() {
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
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={openStripeDashboard}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4 mr-2" />
      )}
      Stripe Dashboard
    </Button>
  );
}

