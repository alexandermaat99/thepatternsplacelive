'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
      </div>
      
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {product.title}
          </CardTitle>
          <Badge variant="secondary" className="ml-2">
            {product.category}
          </Badge>
        </div>
        {product.profiles && (
          <p className="text-sm text-muted-foreground">
            by {product.profiles.full_name}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {product.description}
        </p>
        <p className="text-xl font-bold mt-2">
          {formatAmountForDisplay(product.price, product.currency)}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Link href={`/marketplace/product/${product.id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 