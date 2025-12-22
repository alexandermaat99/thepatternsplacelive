'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';
import { MultiImageUpload } from '@/components/marketplace/multi-image-upload';
import { DigitalFileUpload } from '@/components/marketplace/digital-file-upload';
import { CategoryInput, linkCategoriesToProduct } from '@/components/marketplace/category-input';
import { ArrowLeft, Info, Award } from 'lucide-react';
import Link from 'next/link';
import type { UserProfile, StripeAccountStatus } from '@/lib/auth-helpers';
import { DIFFICULTY_LEVELS } from '@/lib/constants';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import { FeesInfoModal } from '@/components/marketplace/fees-info-modal';
import { PATTERN_POINTS } from '@/lib/pattern-points';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/contexts/toast-context';

interface SellFormProps {
  user: any;
  profile: UserProfile | null;
  stripeStatus: StripeAccountStatus;
  canSell: boolean;
}

interface FieldErrors {
  title?: string;
  description?: string;
  price?: string;
  difficulty?: string;
  images?: string;
  files?: string;
}

export function SellForm({ user, profile, stripeStatus, canSell }: SellFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const shouldScrollRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    details: '',
    price: '',
    category: '',
    difficulty: '' as string,
    images: [] as string[],
    files: [] as string[],
    is_free: false,
  });

  // Scroll to error field when fieldErrors change
  useEffect(() => {
    if (shouldScrollRef.current) {
      const fieldId = shouldScrollRef.current;
      shouldScrollRef.current = null;

      // Wait for DOM to update
      setTimeout(() => {
        const element = document.getElementById(fieldId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [fieldErrors]);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Validate title
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Product title is required';
    }

    // Validate description
    if (!formData.description || formData.description.trim() === '') {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    // Validate price (if not free)
    if (!formData.is_free) {
      if (!formData.price || formData.price.trim() === '') {
        errors.price = 'Please enter a price';
      } else {
        const price = parseFloat(formData.price);
        if (isNaN(price)) {
          errors.price = 'Please enter a valid price';
        } else if (price < 0) {
          errors.price = 'Price cannot be negative';
        } else if (price === 0) {
          errors.price =
            'Price cannot be $0.00. If you want to list a free pattern, please toggle the "Free Pattern" switch above.';
        } else if (price < 1.0) {
          errors.price = 'Price must be at least $1.00 for paid patterns';
        }
      }
    }

    // Validate difficulty
    if (!formData.difficulty || formData.difficulty.trim() === '') {
      errors.difficulty = 'Please select a difficulty level';
    }

    // Validate images
    if (!formData.images || formData.images.length === 0) {
      errors.images = 'Please upload at least one image';
    }

    // Validate files
    if (!formData.files || formData.files.length === 0) {
      errors.files = 'Please upload at least one PDF file';
    }

    // Set errors immediately
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      shouldScrollRef.current = firstErrorField;
      setFieldErrors(errors);
      console.log('Validation errors set:', errors);
      return false;
    }

    // Clear errors if validation passes
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Don't clear fieldErrors here - let validateForm set them

    try {
      if (!user) {
        throw new Error('You must be logged in to list a product');
      }

      // Validate all fields
      if (!validateForm()) {
        setIsLoading(false);
        showToast('Please fix the errors in the form', 'error');
        return;
      }

      setIsLoading(true);

      // Validate price (additional check for consistency)
      if (!formData.is_free) {
        const price = parseFloat(formData.price);
        if (!formData.price || formData.price.trim() === '') {
          setFieldErrors({ price: 'Please enter a price' });
          setIsLoading(false);
          return;
        }
        if (isNaN(price)) {
          setFieldErrors({ price: 'Please enter a valid price' });
          setIsLoading(false);
          return;
        }
        if (price < 0) {
          setFieldErrors({ price: 'Price cannot be negative' });
          setIsLoading(false);
          return;
        }
        if (price === 0) {
          setFieldErrors({
            price:
              'Price cannot be $0.00. If you want to list a free pattern, please toggle the "Free Pattern" switch above.',
          });
          setIsLoading(false);
          return;
        }
        if (price < 1.0) {
          setFieldErrors({ price: 'Price must be at least $1.00 for paid patterns' });
          setIsLoading(false);
          return;
        }
      }

      const price = formData.is_free ? 0 : parseFloat(formData.price);

      const isFree = formData.is_free;

      // Additional validation (should already be caught by validateForm, but double-check)
      if (!formData.files || formData.files.length === 0) {
        setFieldErrors({ files: 'Please upload at least one PDF file for your product' });
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          title: formData.title,
          description: formData.description,
          details: formData.details || null,
          price: price,
          currency: 'USD',
          category: formData.category, // Keep for backward compatibility
          difficulty: formData.difficulty || null,
          images: formData.images.length > 0 ? formData.images : [],
          image_url: formData.images[0] || null,
          files: formData.files.length > 0 ? formData.files : [],
          user_id: user.id,
          is_active: true,
          is_free: isFree,
        })
        .select()
        .single();

      if (error) throw error;

      // Link categories to the product (comma-separated input)
      // Also automatically add "free" category if product is free
      if (product) {
        try {
          let categoriesToLink = formData.category || '';

          // If product is free, add "free" category if not already present
          if (isFree) {
            const categoryList = categoriesToLink
              .split(',')
              .map(c => c.trim().toLowerCase())
              .filter(c => c.length > 0);

            if (!categoryList.includes('free')) {
              categoriesToLink = categoriesToLink ? `${categoriesToLink}, free` : 'free';
            }
          }

          if (categoriesToLink) {
            await linkCategoriesToProduct(product.id, categoriesToLink);
            console.log('Categories linked successfully');
          }
        } catch (categoryError) {
          console.error('Error linking categories:', categoryError);
          const errorMessage =
            categoryError instanceof Error ? categoryError.message : 'Unknown error';
          alert(
            `Product created successfully, but there was an issue linking categories: ${errorMessage}. You can edit the product to add categories later.`
          );
          // Don't fail the whole operation if category linking fails
        }
      }

      // Award pattern points for listing (non-blocking) - call API route instead
      if (product && user) {
        try {
          // Call API route to award points server-side
          fetch('/api/pattern-points/award', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'list' }),
          }).catch(error => {
            console.error('Error awarding pattern points for listing:', error);
            // Don't fail the operation if points fail
          });
        } catch (error) {
          console.error('Error awarding pattern points for listing:', error);
          // Don't fail the operation if points fail
        }
      }

      router.push('/marketplace');
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Failed to create product. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <FeesInfoModal isOpen={showFeesModal} onClose={() => setShowFeesModal(false)} />
      <div className="container  mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">List Your Product</CardTitle>
              <Badge className="bg-rose-300 text-white border-0 hover:bg-rose-400">
                <Award className="h-3 w-3 mr-1" />
                Earn {PATTERN_POINTS.LIST_PRODUCT} Pattern Points
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              List your product to earn {PATTERN_POINTS.LIST_PRODUCT} pattern points! You'll also
              earn {PATTERN_POINTS.SELL_PRODUCT} points each time someone purchases your product.
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-md">
                <p className="text-sm text-rose-400 dark:text-rose-400">{error}</p>
              </div>
            )}
            {!canSell && !formData.is_free ? (
              <div className="space-y-4">
                {!stripeStatus.isConnected ? (
                  <p className="text-rose-300 font-medium">
                    You must connect your Stripe account before listing a paid product. Free
                    patterns don't require Stripe.
                  </p>
                ) : (
                  <p className="text-orange-500 font-medium">
                    Your Stripe account is not fully set up yet. Please complete the onboarding
                    process. Free patterns don't require Stripe.
                  </p>
                )}
                <StripeConnectButton userId={user.id} />
                {profile?.stripe_account_id && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Debug Info:</strong>
                      <br />
                      Account ID: {profile.stripe_account_id}
                      <br />
                      Status: {stripeStatus.status}
                      <br />
                      Fully Onboarded: {stripeStatus.isOnboarded ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div>
                  <Label htmlFor="title">Product Title</Label>
                  <div
                    className={
                      fieldErrors.title
                        ? 'rounded-md border-2 border-rose-300 focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-offset-0'
                        : ''
                    }
                  >
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={e => {
                        setFormData({ ...formData, title: e.target.value });
                        if (fieldErrors.title) {
                          setFieldErrors({ ...fieldErrors, title: undefined });
                        }
                      }}
                      required
                      placeholder="Enter product title"
                      className={
                        fieldErrors.title
                          ? 'border-0 focus-visible:ring-0 focus-visible:ring-offset-0'
                          : ''
                      }
                    />
                  </div>
                  {fieldErrors.title && (
                    <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">
                    Description
                    <span className="text-muted-foreground text-sm font-normal ml-2">
                      ({formData.description.length}/500 characters)
                    </span>
                  </Label>
                  <div
                    className={
                      fieldErrors.description
                        ? 'rounded-md border-2 border-rose-300 focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-offset-0'
                        : ''
                    }
                  >
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const value = e.target.value;
                        if (value.length <= 500) {
                          setFormData({ ...formData, description: value });
                          if (fieldErrors.description) {
                            setFieldErrors({ ...fieldErrors, description: undefined });
                          }
                        }
                      }}
                      required
                      placeholder="Describe your product"
                      rows={4}
                      maxLength={500}
                      className={
                        fieldErrors.description
                          ? 'border-0 focus-visible:ring-0 focus-visible:ring-offset-0'
                          : ''
                      }
                    />
                  </div>
                  {fieldErrors.description && (
                    <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                      {fieldErrors.description}
                    </p>
                  )}
                  {!fieldErrors.description && formData.description.length > 450 && (
                    <p className="text-sm text-orange-600 mt-1">
                      Warning: Description is getting long ({formData.description.length}{' '}
                      characters).
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="details">
                    Details (Optional)
                    <span className="text-muted-foreground text-sm font-normal ml-2">
                      ({formData.details.length}/10000 characters)
                    </span>
                  </Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      const value = e.target.value;
                      if (value.length <= 10000) {
                        setFormData({ ...formData, details: value });
                      }
                    }}
                    placeholder="Additional product details, specifications, or information"
                    rows={4}
                    maxLength={10000}
                  />
                  {formData.details.length > 9000 && (
                    <p className="text-sm text-orange-600 mt-1">
                      Warning: Details is getting long ({formData.details.length} characters).
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="free-toggle"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Free Pattern
                      </Label>
                      <Switch
                        id="free-toggle"
                        checked={formData.is_free}
                        onCheckedChange={checked => {
                          // When switching from free to paid, ensure price is at least 1.00
                          // When switching from paid to free, set price to 0
                          const newPrice = checked
                            ? '0'
                            : formData.price && parseFloat(formData.price) >= 1.0
                              ? formData.price
                              : '1.00';
                          setFormData({
                            ...formData,
                            is_free: checked,
                            price: newPrice,
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className={
                      fieldErrors.price && !formData.is_free
                        ? 'rounded-md border-2 border-rose-300 focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-offset-0'
                        : ''
                    }
                  >
                    <Input
                      id="price"
                      type={formData.is_free ? 'text' : 'number'}
                      step="0.01"
                      min={formData.is_free ? undefined : '1.00'}
                      value={formData.is_free ? 'Free' : formData.price}
                      onChange={e => {
                        if (!formData.is_free) {
                          setFormData({ ...formData, price: e.target.value });
                          if (fieldErrors.price) {
                            setFieldErrors({ ...fieldErrors, price: undefined });
                          }
                        }
                      }}
                      required={!formData.is_free}
                      disabled={formData.is_free}
                      placeholder={formData.is_free ? 'Free' : '1.00'}
                      readOnly={formData.is_free}
                      className={
                        fieldErrors.price && !formData.is_free
                          ? 'border-0 focus-visible:ring-0 focus-visible:ring-offset-0'
                          : ''
                      }
                    />
                  </div>
                  {fieldErrors.price && (
                    <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                      {fieldErrors.price}
                    </p>
                  )}
                  {formData.is_free ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p className="text-green-600 font-medium">
                        This is a free pattern. Buyers will be able to download it without payment.
                        The "free" category will be added automatically.
                      </p>
                    </div>
                  ) : (
                    formData.price &&
                    !isNaN(parseFloat(formData.price)) &&
                    parseFloat(formData.price) >= 1.0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Customer pays:</span>
                          <span className="font-medium">
                            ${parseFloat(formData.price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            {(() => {
                              const waivePlatformFees = profile 
                                ? (profile.completed_sales_count || 0) < 5
                                : false;
                              return waivePlatformFees 
                                ? 'Payment Processing Fee (platform fee waived)'
                                : 'Fees (processing + platform fees)';
                            })()}
                            <button
                              type="button"
                              onClick={() => setShowFeesModal(true)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Info className="h-3 w-3" />
                            </button>
                          </span>
                          <span className="font-medium text-orange-600">
                            -$
                            {formData.price && !isNaN(parseFloat(formData.price))
                              ? (() => {
                                  const waivePlatformFees = profile 
                                    ? (profile.completed_sales_count || 0) < 5
                                    : false;
                                  return (
                                    calculateEtsyFees(
                                      Math.round(parseFloat(formData.price) * 100),
                                      waivePlatformFees
                                    ).totalFee / 100
                                  ).toFixed(2);
                                })()
                              : '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t">
                          <span className="font-medium">You receive:</span>
                          <span className="font-bold text-green-600">
                            $
                            {formData.price && !isNaN(parseFloat(formData.price))
                              ? (() => {
                                  const waivePlatformFees = profile 
                                    ? (profile.completed_sales_count || 0) < 5
                                    : false;
                                  return (
                                    parseFloat(formData.price) -
                                    calculateEtsyFees(
                                      Math.round(parseFloat(formData.price) * 100),
                                      waivePlatformFees
                                    ).totalFee /
                                      100
                                  ).toFixed(2);
                                })()
                              : '0.00'}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <CategoryInput
                  value={formData.category}
                  onChange={value => setFormData({ ...formData, category: value })}
                />

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Link
                      href="/marketplace/difficulty-levels"
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Learn about difficulty levels"
                    >
                      <Info className="h-4 w-4" />
                    </Link>
                  </div>
                  <select
                    id="difficulty"
                    value={formData.difficulty}
                    onChange={e => {
                      setFormData({ ...formData, difficulty: e.target.value });
                      if (fieldErrors.difficulty) {
                        setFieldErrors({ ...fieldErrors, difficulty: undefined });
                      }
                    }}
                    required
                    className={`flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
                      fieldErrors.difficulty
                        ? '!border-rose-300 focus-visible:!ring-rose-300 focus-visible:ring-2'
                        : 'border border-input focus-visible:ring-1 focus-visible:ring-ring'
                    }`}
                  >
                    <option value="" disabled>
                      Select difficulty level
                    </option>
                    {DIFFICULTY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.difficulty && (
                    <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                      {fieldErrors.difficulty}
                    </p>
                  )}
                </div>

                {user && (
                  <>
                    <div>
                      <MultiImageUpload
                        value={formData.images}
                        onChange={urls => {
                          setFormData({ ...formData, images: urls });
                          if (fieldErrors.images) {
                            setFieldErrors({ ...fieldErrors, images: undefined });
                          }
                        }}
                        userId={user.id}
                        maxImages={10}
                      />
                      {fieldErrors.images && (
                        <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                          {fieldErrors.images}
                        </p>
                      )}
                    </div>

                    <div>
                      <DigitalFileUpload
                        value={formData.files}
                        onChange={paths => {
                          setFormData({ ...formData, files: paths });
                          if (fieldErrors.files) {
                            setFieldErrors({ ...fieldErrors, files: undefined });
                          }
                        }}
                        userId={user.id}
                        maxFiles={10}
                        maxFileSizeMB={100}
                      />
                      {fieldErrors.files && (
                        <p className="text-sm text-rose-400 dark:text-rose-400 mt-1">
                          {fieldErrors.files}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'List Product'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
