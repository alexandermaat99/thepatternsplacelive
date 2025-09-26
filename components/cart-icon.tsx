'use client';

import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export function CartIcon() {
  const { state } = useCart();

  return (
    <Button asChild variant="ghost" size="sm" className="relative">
      <Link href="/cart" className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Cart
        {state.itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {state.itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
