'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmountForDisplay } from '@/lib/utils-client';
import Link from 'next/link';
import Image from 'next/image';
import { getDifficultyLabel, getDifficultyColor } from '@/lib/constants';
import { Heart, Star } from 'lucide-react';
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
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  // Get the first image from images array or fallback to image_url
  const getImageUrl = () => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.image_url;
  };

  const imageUrl = getImageUrl();
  const favorited = isFavorite(product.id);

  // Fetch reviews to calculate average rating
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews?productId=${product.id}`);
        const data = await response.json();

        if (data.reviews && data.reviews.length > 0) {
          const ratings = data.reviews.map((r: { rating: number }) => r.rating);
          const avg =
            ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length;
          setAverageRating(avg);
          setReviewCount(data.reviews.length);
        }
      } catch (error) {
        // Silently fail - reviews are optional
        console.error('Error fetching reviews:', error);
      }
    };

    fetchReviews();
  }, [product.id]);

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
          {/* Difficulty badge - top left */}
          {product.difficulty && (
            <div
              className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
              style={{
                backgroundColor: getDifficultyColor(product.difficulty).bg,
                color: getDifficultyColor(product.difficulty).text,
              }}
            >
              {getDifficultyLabel(product.difficulty)}
            </div>
          )}

          {/* Price overlay bubble */}
          <div className="absolute bottom-2 right-2 bg-background/40 backdrop-blur-sm rounded-full px-3 py-1 shadow-md border border-border/50">
            <span className="text-xs font-bold text-foreground">
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
              <Heart className={`h-5 w-5 transition-all ${favorited ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        <CardHeader className="p-4">
          <div className="flex items-start gap-2">
            <CardTitle className="text-sm font-semibold line-clamp-2 flex-1">
              {product.title}
            </CardTitle>
            {averageRating !== null && reviewCount > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {product.profiles && (
            <p className="text-sm text-muted-foreground mt-1">
              {product.profiles.username ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (product.profiles?.username) {
                      router.push(`/marketplace/seller/${product.profiles.username}`);
                    }
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

      <AuthPromptDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </Card>
  );
}
