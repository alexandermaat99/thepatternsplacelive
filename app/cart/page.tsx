'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import { ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RemoveCartItemDialog } from '@/components/remove-cart-item-dialog';

export default function CartPage() {
  const { state, removeItem, clearCart } = useCart();
  const router = useRouter();
  const [itemToRemove, setItemToRemove] = useState<{ id: string; title: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleRemoveClick = (item: { id: string; title: string }) => {
    setItemToRemove(item);
    setIsDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeItem(itemToRemove.id);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Your cart is empty
              </h3>
              <p className="text-muted-foreground mb-4">
                Add some products to get started!
              </p>
              <Link href="/marketplace">
                <Button>
                  Browse Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Shopping Cart
            </h1>
            <p className="text-muted-foreground">
              {state.items.length} {state.items.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={clearCart}
            className="hidden sm:flex text-red-600 hover:text-red-700"
          >
            Clear Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {state.items.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Clickable Product Area */}
                    <Link 
                      href={`/marketplace/product/${item.id}?from=cart`}
                      className="flex gap-4 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* Product Image */}
                      <div className="w-20 h-20 relative flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.title}
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">No image</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{item.category}</p>
                        <p className="text-lg font-bold text-primary">
                          {formatAmountForDisplay(item.price, item.currency)}
                        </p>
                      </div>
                    </Link>

                    {/* Remove Button */}
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveClick({ id: item.id, title: item.title });
                        }}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal ({state.items.length} {state.items.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-medium">
                    {formatAmountForDisplay(state.total, 'USD')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-medium">Free</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatAmountForDisplay(state.total, 'USD')}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  className="w-full"
                  size="lg"
                >
                  Proceed to Checkout
                </Button>
                
                <Link href="/marketplace" className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <RemoveCartItemDialog
          item={itemToRemove}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setItemToRemove(null);
          }}
          onConfirm={handleConfirmRemove}
        />
    </div>
  );
}
