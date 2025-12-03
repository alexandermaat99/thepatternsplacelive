'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmountForDisplay } from '@/lib/utils-client';
import { Lock, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function CheckoutPage() {
  const router = useRouter();
  const { state } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (state.items.length === 0) {
      router.push('/cart');
    }
  }, [state.items.length, router]);

  const handleCheckout = async () => {
    setIsProcessing(true);

    try {
      // Prepare cart items for checkout (digital products, quantity always 1)
      const cartItems = state.items.map(item => ({
        productId: item.id,
        quantity: 1,
      }));

      // Create Stripe checkout session
      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (state.items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {state.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.title}</p>
                    </div>
                    <p className="font-medium">
                      {formatAmountForDisplay(item.price, item.currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatAmountForDisplay(state.total, 'USD')}</span>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatAmountForDisplay(state.total, 'USD')}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleCheckout} className="w-full" size="lg" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" text="" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Complete Purchase
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your payment information is secure and encrypted
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
