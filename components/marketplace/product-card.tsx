'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import Link from 'next/link';
import Image from 'next/image';
import { getDifficultyLabel, getDifficultyVariant } from '@/lib/constants';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { AuthPromptDialog } from '@/components/auth-prompt-dialog';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  images?: string[];
  category: string; // Keep for backward compatibility
  difficulty?: string | null;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  product_categories?: Array<{
    category: Category;
  }>;
}

interface ProductCardProps {
  product: Product;
  hideFavorite?: boolean;
}

export function ProductCard({ product, hideFavorite = false }: ProductCardProps) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  // Get the first image from images array or fallback to image_url
  const getImageUrl = () => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.image_url;
  };

  const imageUrl = getImageUrl();
  const favorited = isFavorite(product.id);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) return;
    
    // Check if user is authenticated
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    setIsToggling(true);
    const wasFavorite = favorited;
    const isNowFavorite = await toggleFavorite(product.id);
    setIsToggling(false);
    
    // Show toast notification
    if (isNowFavorite && !wasFavorite) {
      showToast('Successfully added to your favorites', 'success');
    } else if (!isNowFavorite && wasFavorite) {
      showToast('Removed from your favorites', 'info');
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
          
          {/* Favorite heart button - appears on hover, always visible if favorited */}
          {!hideFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`absolute top-2 right-2 p-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border/50 transition-all duration-200 z-10 ${
                isHovered || favorited ? 'opacity-100 scale-100' : 'opacity-0 scale-95 md:opacity-0'
              } ${isToggling ? 'pointer-events-none opacity-50' : 'hover:scale-110 active:scale-95'} ${
                favorited ? 'text-red-500 opacity-100' : 'text-muted-foreground hover:text-red-500'
              }`}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
              type="button"
            >
              <Heart 
                className={`h-5 w-5 transition-all ${favorited ? 'fill-current' : ''}`}
              />
            </button>
          )}
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
              {product.profiles.username ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(`/marketplace/seller/${product.profiles.username}`);
                  }}
                  className="hover:text-primary transition-colors underline text-left"
                >
                  @{product.profiles.username}
                </button>
              ) : (
                <>by {product.profiles.full_name || 'Unknown'}</>
              )}
            </p>
          )}
        </CardHeader>
      </Link>
      
      <AuthPromptDialog 
        isOpen={showAuthDialog} 
        onClose={() => setShowAuthDialog(false)} 
      />
    </Card>
  );
} 