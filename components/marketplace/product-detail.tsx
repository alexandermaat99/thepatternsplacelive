'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import { ProductImageGallery } from '@/components/marketplace/product-image-gallery';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/contexts/toast-context';
import { AuthPromptDialog } from '@/components/auth-prompt-dialog';
import { linkifyText } from '@/lib/text-utils';
import { getDifficultyLabel, getDifficultyVariant } from '@/lib/constants';

interface Product {
  id: string;
  title: string;
  description: string;
  details?: string | null;
  price: number;
  currency: string;
  image_url?: string;
  images?: string[];
  category: string;
  difficulty?: string | null;
  user_id: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const favorited = isFavorite(product.id);

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

  const handleFavoriteClick = async () => {
    if (isTogglingFavorite) return;

    // Check if user is authenticated
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    setIsTogglingFavorite(true);
    const wasFavorite = favorited;
    const isNowFavorite = await toggleFavorite(product.id);
    setIsTogglingFavorite(false);

    // Show toast notification
    if (isNowFavorite && !wasFavorite) {
      showToast('Successfully added to your favorites', 'success');
    } else if (!isNowFavorite && wasFavorite) {
      showToast('Removed from your favorites', 'info');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 -ml-2 sm:ml-0"
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-3xl font-bold text-primary">
                  {formatAmountForDisplay(product.price, product.currency)}
                </p>
                <h1 className="text-2xl mt-2">{product.title}</h1>
                {product.profiles && (
                  <p className="text-muted-foreground mt-1">
                    {product.profiles.username ? (
                      <Link
                        href={`/marketplace/seller/${product.profiles.username}`}
                        className="hover:text-primary transition-colors"
                      >
                        @{product.profiles.username}
                      </Link>
                    ) : (
                      <>Sold by {product.profiles.full_name || 'Unknown'}</>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={handleFavoriteClick}
                disabled={isTogglingFavorite}
                className={`p-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border/50 transition-all duration-200 flex-shrink-0 ${
                  isTogglingFavorite
                    ? 'pointer-events-none opacity-50'
                    : 'hover:scale-110 active:scale-95'
                } ${favorited ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                type="button"
              >
                <Heart className={`h-6 w-6 transition-all ${favorited ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{product.category}</Badge>
              {product.difficulty && (
                <Badge variant={getDifficultyVariant(product.difficulty)}>
                  {getDifficultyLabel(product.difficulty)}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Button onClick={handleAddToCart} className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                'Adding...'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>

          {/* Description Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Description</h3>
            <div className="text-muted-foreground whitespace-pre-wrap">
              {linkifyText(product.description).map((part, index) => (
                <React.Fragment key={index}>{part}</React.Fragment>
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="border-t pt-4">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
            >
              <h3 className="font-semibold">Details</h3>
              <div
                className="transition-transform duration-300 ease-in-out"
                style={{ transform: isDetailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isDetailsExpanded ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-4">
                {product.details ? (
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {linkifyText(product.details).map((part, index) => (
                      <React.Fragment key={index}>{part}</React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm italic">
                    No additional details provided.
                  </div>
                )}
                <div className="space-y-2 text-sm pt-4 border-t">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                  {product.difficulty && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Difficulty</span>
                      <span className="font-medium">{getDifficultyLabel(product.difficulty)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Product ID</span>
                    <span className="font-mono text-xs">{product.id}</span>
                  </div>
                  {product.profiles && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Seller</span>
                      <span className="font-medium">
                        {product.profiles.username ? (
                          <Link
                            href={`/marketplace/seller/${product.profiles.username}`}
                            className="hover:text-primary transition-colors"
                          >
                            @{product.profiles.username}
                          </Link>
                        ) : (
                          product.profiles.full_name || 'Unknown'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthPromptDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </div>
  );
}
