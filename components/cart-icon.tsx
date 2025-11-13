'use client';

import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export function CartIcon() {
  const { state } = useCart();

  return (
    <div className="relative h-8 w-8 flex-shrink-0">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 flex-shrink-0"
        asChild
      >
        <Link href="/cart" className="flex items-center justify-center h-full w-full">
          <ShoppingCart className="h-4 w-4" />
        </Link>
      </Button>
      {state.itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full h-4 w-4 min-w-[1rem] flex items-center justify-center leading-none border-2 border-background shadow-sm pointer-events-none">
          {state.itemCount > 99 ? '99+' : state.itemCount}
        </span>
      )}
    </div>
  );
}
