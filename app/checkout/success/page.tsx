'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ShoppingBag, Home, Loader2, Award } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { PATTERN_POINTS } from '@/lib/pattern-points';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const { user } = useAuth();
  const hasProcessed = useRef(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [orderCreated, setOrderCreated] = useState(false);

  // Process order and clear cart on successful checkout (only once)
  useEffect(() => {
    async function processOrder() {
      if (hasProcessed.current || !sessionId) {
        setIsProcessing(false);
        return;
      }

      hasProcessed.current = true;

      try {
        // Call API to process the order
        const response = await fetch('/api/process-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Order processed:', data);
          setOrderCreated(true);
        } else {
          console.error('Order processing failed:', data.error);
        }
      } catch (error) {
        console.error('Error processing order:', error);
      } finally {
        setIsProcessing(false);
        clearCart();
      }
    }

    processOrder();
  }, [sessionId, clearCart]);
  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
            <CardHeader>
              <CardTitle className="text-2xl">Processing your order...</CardTitle>
            </CardHeader>
            <p className="text-muted-foreground">Please wait while we confirm your purchase.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />

          <CardHeader>
            <CardTitle className="text-2xl text-green-600">Order Confirmed!</CardTitle>
          </CardHeader>

          <div className="space-y-4 mb-8">
            <p className="text-muted-foreground">
              Thank you for your purchase! Your order has been successfully placed.
            </p>
            {user && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    <strong>You earned {PATTERN_POINTS.BUY_PRODUCT} Pattern Points</strong> for this
                    purchase!
                  </p>
                </div>
              </div>
            )}
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

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
              <CardHeader>
                <CardTitle className="text-2xl">Loading...</CardTitle>
              </CardHeader>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
