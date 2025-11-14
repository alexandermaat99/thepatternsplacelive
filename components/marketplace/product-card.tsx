'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import Link from 'next/link';
import Image from 'next/image';
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
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // Get the first image from images array or fallback to image_url
  const getImageUrl = () => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.image_url;
  };

  const imageUrl = getImageUrl();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/marketplace/product/${product.id}`} className="w-full">
        <div className="aspect-square relative overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          {/* Price overlay bubble */}
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-border/50">
            <span className="text-sm font-bold text-foreground">
              {formatAmountForDisplay(product.price, product.currency)}
            </span>
          </div>
        </div>
        
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
              {product.title}
            </CardTitle>
            {product.difficulty && (
              <Badge variant={getDifficultyVariant(product.difficulty)} className="self-start sm:ml-2 flex-shrink-0">
                {getDifficultyLabel(product.difficulty)}
              </Badge>
            )}
          </div>
          {product.profiles && (
            <p className="text-sm text-muted-foreground mt-1">
              by {product.profiles.full_name}
            </p>
          )}
        </CardHeader>
      </Link>
    </Card>
  );
} 