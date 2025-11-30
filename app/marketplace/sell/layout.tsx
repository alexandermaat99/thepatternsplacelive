'use client';

import { RequireAuth } from '@/components/require-auth';

export default function SellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {children}
    </RequireAuth>
  );
}

