'use client';

import { ToastProvider } from '@/contexts/toast-context';
import { CartProvider } from '@/contexts/cart-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ConsoleWelcome } from '@/components/console-welcome';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConsoleWelcome />
      <ToastProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

