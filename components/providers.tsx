'use client';

import { ToastProvider } from '@/contexts/toast-context';
import { CartProvider } from '@/contexts/cart-context';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </ToastProvider>
  );
}

