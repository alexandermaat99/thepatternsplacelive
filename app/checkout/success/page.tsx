'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ShoppingBag, Home } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const hasClearedCart = useRef(false);

  // Clear cart on successful checkout (only once)
  useEffect(() => {
    if (!hasClearedCart.current) {
      clearCart();
      hasClearedCart.current = true;
    }
  }, [clearCart]);
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">
                Order Confirmed!
              </CardTitle>
            </CardHeader>
            
            <div className="space-y-4 mb-8">
              <p className="text-muted-foreground">
                Thank you for your purchase! Your order has been successfully placed.
              </p>
              <p className="text-sm text-muted-foreground">
                You will receive an email confirmation shortly with your order details.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/marketplace">
                <Button variant="outline" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/">
                <Button className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
