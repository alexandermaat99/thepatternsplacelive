'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import { ProductImageGallery } from '@/components/marketplace/product-image-gallery';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/cart-context';
import { linkifyText } from '@/lib/text-utils';
import { getDifficultyLabel, getDifficultyVariant } from '@/lib/constants';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  images?: string[];
  category: string;
  difficulty?: string | null;
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const handleAddToCart = () => {
    setIsLoading(true);
    
    try {
      addItem(product);
      // Show success feedback
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Add to cart error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <ProductImageGallery
          images={
            product.images && Array.isArray(product.images) && product.images.length > 0
              ? product.images
              : product.image_url
              ? [product.image_url]
              : []
          }
          title={product.title}
        />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary">{product.category}</Badge>
              {product.difficulty && (
                <Badge variant={getDifficultyVariant(product.difficulty)}>
                  {getDifficultyLabel(product.difficulty)}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{product.title}</h1>
            {product.profiles && (
              <p className="text-muted-foreground mt-2">
                Sold by {product.profiles.full_name}
              </p>
            )}
          </div>

          <div>
            <p className="text-3xl font-bold text-primary">
              {formatAmountForDisplay(product.price, product.currency)}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <div className="text-muted-foreground whitespace-pre-wrap">
              {linkifyText(product.description).map((part, index) => (
                <React.Fragment key={index}>{part}</React.Fragment>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleAddToCart} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 