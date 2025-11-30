'use client';

import { Navigation } from '@/components/navigation';
import { RequireAuth } from '@/components/require-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <Navigation showMarketplaceLinks={true} />
      <RequireAuth>
        {children}
      </RequireAuth>
    </div>
  );
}

