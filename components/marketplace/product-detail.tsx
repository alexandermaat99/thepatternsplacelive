'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAmountForDisplay } from '@/lib/utils-client';
import { ProductImageGallery } from '@/components/marketplace/product-image-gallery';
import { ArrowLeft, ShoppingCart, Heart, ChevronDown, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/contexts/toast-context';
import { AuthPromptDialog } from '@/components/auth-prompt-dialog';
import { linkifyText } from '@/lib/text-utils';
import { getDifficultyLabel, getDifficultyColor } from '@/lib/constants';
import { ProductFilesDownload } from '@/components/marketplace/product-files-download';
import { EditProductModal } from '@/components/edit-product-modal';
import { ProductReviews } from '@/components/marketplace/product-reviews';
import { ShareButton } from '@/components/marketplace/share-button';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  details?: string | null;
  price: number;
  currency: string;
  image_url?: string;
  images?: string[];
  files?: string[];
  category: string; // Keep for backward compatibility
  difficulty?: string | null;
  user_id: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  product_categories?: Array<{
    category: Category;
  }>;
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
  const [fromCart, setFromCart] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const favorited = isFavorite(product.id);
  const isOwner = user?.id === product.user_id;

  // Check if user came from cart or auth pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setFromCart(params.get('from') === 'cart');
    }
  }, []);

  // Handle hash navigation (e.g., #reviews) - industry standard approach
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (hash === '#reviews') {
        // Wait for reviews component to render
        setTimeout(() => {
          const element = document.getElementById('reviews');
          if (element) {
            const offset = 100;
            const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementTop - offset;
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth',
            });
          }
        }, 300);
      }
    };

    // Check on mount
    handleHashNavigation();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, []);

  const handleAddToCart = () => {
    setIsLoading(true);

    try {
      const wasAdded = addItem(product);

      if (wasAdded) {
        // Item was successfully added
        showToast(`${product.title} added to cart`, 'success');
      } else {
        // Item already in cart
        showToast('This item is already in your cart', 'info');
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Add to cart error:', error);
      showToast('Failed to add item to cart. Please try again.', 'error');
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

  const handleBackClick = () => {
    if (typeof window === 'undefined') {
      router.push('/marketplace');
      return;
    }

    // Check if user came from the cart page (via query parameter)
    if (fromCart) {
      // If coming from cart, go to marketplace instead
      router.push('/marketplace');
      return;
    }

    // Check if previous page in history might be an auth page
    // We check referrer to determine if we should avoid router.back()
    const referrer = document.referrer;
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const referrerPath = referrerUrl.pathname;

        // If referrer is an auth page, go to marketplace instead
        if (referrerPath.startsWith('/auth/') || referrerPath.startsWith('/login')) {
          router.push('/marketplace');
          return;
        }
      } catch (e) {
        // Invalid referrer, continue with router.back()
      }
    }

    // Default: use browser back to preserve scroll position and filters
    // This is industry standard - browser automatically restores scroll position
    router.back();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="flex items-center gap-2 -ml-2 sm:ml-0"
        >
          <ArrowLeft className="h-4 w-4" />
          {fromCart ? 'Back to Marketplace' : 'Back'}
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
              {/* Display categories from product_categories if available, otherwise fallback to old category field */}
              {product.product_categories && product.product_categories.length > 0
                ? product.product_categories.map(pc => (
                    <Badge key={pc.category.id} variant="secondary">
                      {pc.category.name}
                    </Badge>
                  ))
                : product.category &&
                  // Fallback: parse comma-separated categories from old category field
                  product.category.split(',').map((cat, index) => {
                    const trimmedCat = cat.trim();
                    return trimmedCat ? (
                      <Badge key={`${trimmedCat}-${index}`} variant="secondary">
                        {trimmedCat}
                      </Badge>
                    ) : null;
                  })}
              {product.difficulty && (
                <Badge
                  style={{
                    backgroundColor: getDifficultyColor(product.difficulty).bg,
                    color: getDifficultyColor(product.difficulty).text,
                    borderColor: getDifficultyColor(product.difficulty).bg,
                  }}
                >
                  {getDifficultyLabel(product.difficulty)}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {isOwner ? (
              <Button
                onClick={() => setIsEditModalOpen(true)}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
            ) : (
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
            )}
            <ShareButton
              productId={product.id}
              productTitle={product.title}
              productImage={
                product.images && Array.isArray(product.images) && product.images.length > 0
                  ? product.images[0]
                  : product.image_url || undefined
              }
              className="w-full"
              variant="outline"
              size="lg"
            />
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

          {/* More Details Section */}
          {product.details && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">More Details</h3>
              <div className="relative">
                <div
                  className={`text-muted-foreground whitespace-pre-wrap overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                    isDetailsExpanded ? 'max-h-[1000px]' : 'max-h-32'
                  }`}
                  style={
                    !isDetailsExpanded
                      ? {
                          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0))',
                          WebkitMaskImage:
                            'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0))',
                        }
                      : undefined
                  }
                >
                  {linkifyText(product.details).map((part, index) => (
                    <React.Fragment key={index}>{part}</React.Fragment>
                  ))}
                </div>
                {!isDetailsExpanded ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsExpanded(true)}
                    className="mt-4 w-full"
                  >
                    Show more
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsExpanded(false)}
                    className="mt-4 w-full"
                  >
                    Show less
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <ProductReviews productId={product.id} />

      <AuthPromptDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />

      {isOwner && (
        <EditProductModal
          product={product as any}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
