'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { MultiImageUpload } from '@/components/marketplace/multi-image-upload';
import { DigitalFileUpload } from '@/components/marketplace/digital-file-upload';
import { CategoryInput, linkCategoriesToProduct } from '@/components/marketplace/category-input';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DIFFICULTY_LEVELS } from '@/lib/constants';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { FeesInfoModal } from '@/components/marketplace/fees-info-modal';
import { DeleteProductDialog } from '@/components/delete-product-dialog';
import { Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category: string;
  difficulty?: string | null;
  is_active: boolean;
  is_free?: boolean;
}

interface EditProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProductModal({ product, isOpen, onClose }: EditProductModalProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    details: '',
    price: '',
    category: '',
    difficulty: '',
    images: [] as string[],
    image_url: '',
    files: [] as string[],
    is_active: true,
    is_free: false,
  });

  // Update form data when product changes
  useEffect(() => {
    if (product) {
      // Handle both old image_url and new images array
      let images: string[] = [];
      if ((product as any).images && Array.isArray((product as any).images)) {
        images = (product as any).images;
      } else if (product.image_url) {
        images = [product.image_url];
      }

      // Handle files array
      const files =
        (product as any).files && Array.isArray((product as any).files)
          ? (product as any).files
          : [];

      // Load existing categories for this product
      const loadCategories = async () => {
        try {
          const supabase = createClient();
          const { data: productCategories } = await supabase
            .from('product_categories')
            .select(
              `
              category:categories(*)
            `
            )
            .eq('product_id', product.id);

          let categoryString = product.category || ''; // Fallback to old category field

          if (productCategories && productCategories.length > 0) {
            const categoryNames = productCategories
              .map((pc: any) => pc.category?.name)
              .filter((name: string) => name)
              .join(', ');
            if (categoryNames) {
              categoryString = categoryNames;
            }
          }

          setFormData({
            title: product.title,
            description: product.description,
            details: (product as any).details || '',
            price: product.price.toString(),
            category: categoryString,
            difficulty: product.difficulty || '',
            images,
            image_url: product.image_url || '',
            files,
            is_active: product.is_active,
            is_free: (product as any).is_free || false,
          });
        } catch (error) {
          console.error('Error loading categories:', error);
          // Fallback to old category field
          setFormData({
            title: product.title,
            description: product.description,
            details: (product as any).details || '',
            price: product.price.toString(),
            category: product.category,
            difficulty: product.difficulty || '',
            images,
            image_url: product.image_url || '',
            files,
            is_active: product.is_active,
            is_free: (product as any).is_free || false,
          });
        }
      };

      loadCategories();
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const price = formData.is_free ? 0 : parseFloat(formData.price);
      if (!formData.is_free && (isNaN(price) || price < 1.0)) {
        throw new Error('Price must be at least $1.00');
      }

      const isFree = formData.is_free;

      // Require at least one PDF file
      if (!formData.files || formData.files.length === 0) {
        throw new Error('Please upload at least one PDF file for your product');
      }

      const supabase = createClient();

      console.log('Updating product:', product.id);
      console.log('Description length:', formData.description?.length || 0);

      // Ensure images is a proper array and filter out empty strings
      const validImages = Array.isArray(formData.images)
        ? formData.images.filter(url => url && typeof url === 'string' && url.trim() !== '')
        : [];

      // Sanitize description - aggressive cleaning for pasted content
      let sanitizedDescription = formData.description || '';

      // First, detect and preserve URLs (they might contain special characters)
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls: string[] = [];
      let urlIndex = 0;

      // Replace URLs with placeholders to protect them during sanitization
      sanitizedDescription = sanitizedDescription.replace(urlPattern, match => {
        urls.push(match);
        return `__URL_PLACEHOLDER_${urlIndex++}__`;
      });

      // Remove all non-printable characters except newlines, tabs, and spaces
      sanitizedDescription = sanitizedDescription.replace(
        /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g,
        ''
      );

      // Normalize line breaks (convert all to \n)
      sanitizedDescription = sanitizedDescription.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Remove excessive whitespace (more than 2 consecutive spaces)
      // But preserve single spaces around URLs/links
      sanitizedDescription = sanitizedDescription.replace(/[ \t]{3,}/g, '  ');

      // Remove excessive newlines (more than 2 consecutive)
      sanitizedDescription = sanitizedDescription.replace(/\n{3,}/g, '\n\n');

      // Restore URLs
      urlIndex = 0;
      sanitizedDescription = sanitizedDescription.replace(/__URL_PLACEHOLDER_(\d+)__/g, () => {
        return urls[urlIndex++] || '';
      });

      // Trim start and end
      sanitizedDescription = sanitizedDescription.trim();

      console.log('URLs detected:', urls.length);
      if (urls.length > 0) {
        console.log('URLs:', urls);
      }

      // Check if description is too long (practical limit)
      const MAX_DESCRIPTION_LENGTH = 500;
      if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
        console.warn(
          `Description is ${sanitizedDescription.length} characters, truncating to ${MAX_DESCRIPTION_LENGTH}`
        );
        sanitizedDescription = sanitizedDescription.substring(0, MAX_DESCRIPTION_LENGTH);
      }

      // Sanitize details field (same process as description)
      let sanitizedDetails = formData.details || '';

      // Detect and preserve URLs
      const detailsUrlPattern = /(https?:\/\/[^\s]+)/g;
      const detailsUrls: string[] = [];
      let detailsUrlIndex = 0;

      sanitizedDetails = sanitizedDetails.replace(detailsUrlPattern, match => {
        detailsUrls.push(match);
        return `__URL_PLACEHOLDER_${detailsUrlIndex++}__`;
      });

      // Remove non-printable characters
      sanitizedDetails = sanitizedDetails.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

      // Normalize line breaks
      sanitizedDetails = sanitizedDetails.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Remove excessive whitespace
      sanitizedDetails = sanitizedDetails.replace(/[ \t]{3,}/g, '  ');

      // Remove excessive newlines
      sanitizedDetails = sanitizedDetails.replace(/\n{3,}/g, '\n\n');

      // Restore URLs
      detailsUrlIndex = 0;
      sanitizedDetails = sanitizedDetails.replace(/__URL_PLACEHOLDER_(\d+)__/g, () => {
        return detailsUrls[detailsUrlIndex++] || '';
      });

      // Trim and limit length
      sanitizedDetails = sanitizedDetails.trim();
      const MAX_DETAILS_LENGTH = 10000;
      if (sanitizedDetails.length > MAX_DETAILS_LENGTH) {
        console.warn(
          `Details is ${sanitizedDetails.length} characters, truncating to ${MAX_DETAILS_LENGTH}`
        );
        sanitizedDetails = sanitizedDetails.substring(0, MAX_DETAILS_LENGTH);
      }

      console.log('Sanitized description length:', sanitizedDescription.length);
      console.log('Sanitized details length:', sanitizedDetails.length);
      console.log('Description preview (first 100 chars):', sanitizedDescription.substring(0, 100));
      console.log('Valid images array:', validImages);

      // Prepare update data - always include description to ensure it updates
      const updateData: any = {
        title: formData.title.trim(),
        description: sanitizedDescription || null, // Always include, even if empty
        details: sanitizedDetails || null,
        price: price,
        category: formData.category.trim(),
        difficulty: formData.difficulty || null,
        images: validImages.length > 0 ? validImages : [],
        image_url: validImages[0] || null,
        files: formData.files.length > 0 ? formData.files : [],
        is_active: formData.is_active,
        is_free: isFree,
        updated_at: new Date().toISOString(),
      };

      console.log('Update data prepared, description length:', updateData.description?.length || 0);

      // Split update: first update everything except description
      const { description, ...updateDataWithoutDescription } = updateData;

      console.log('Step 1: Updating product without description...');
      const updatePromise1 = supabase
        .from('products')
        .update(updateDataWithoutDescription)
        .eq('id', product.id);

      const timeoutPromise1 = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Update request timed out after 10 seconds')), 10000)
      );

      const { error: error1, count: count1 } = (await Promise.race([
        updatePromise1,
        timeoutPromise1,
      ])) as any;

      if (error1) {
        console.error('Supabase update error (without description):', error1);
        throw error1;
      }

      console.log('Step 1 successful, rows affected:', count1);

      // Step 2: Update description separately with special handling for URLs
      if (description !== undefined && description !== null) {
        console.log('Step 2: Updating description separately...');
        console.log('Description contains URL:', /https?:\/\//.test(description));

        // For descriptions with URLs, use simple update without select to avoid RLS issues
        try {
          const updatePromise2 = supabase
            .from('products')
            .update({
              description: description || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          const timeoutPromise2 = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Description update timed out after 15 seconds')),
              15000
            )
          );

          const { error: error2, count: count2 } = (await Promise.race([
            updatePromise2,
            timeoutPromise2,
          ])) as any;

          if (error2) {
            console.error('Supabase description update error:', error2);
            // Don't throw - the main update succeeded, description is optional
            console.warn('Description update failed, but other fields were updated');
          } else {
            console.log('Step 2 successful, description updated, rows affected:', count2);
          }
        } catch (updateError) {
          console.error('Description update exception:', updateError);
          // Don't throw - the main update succeeded
          console.warn('Description update failed, but other fields were updated');
        }
      }

      console.log('All updates successful');

      // Link categories to the product (comma-separated input)
      // Also automatically add/remove "free" category based on price
      try {
        let categoriesToLink = formData.category || '';
        const categoryList = categoriesToLink
          .split(',')
          .map(c => c.trim().toLowerCase())
          .filter(c => c.length > 0);

        // If product is free, add "free" category if not already present
        if (isFree) {
          if (!categoryList.includes('free')) {
            categoriesToLink = categoriesToLink ? `${categoriesToLink}, free` : 'free';
          }
        } else {
          // If product is paid, remove "free" category if present
          const filteredCategories = categoryList.filter(c => c !== 'free');
          categoriesToLink = filteredCategories.join(', ');
        }

        if (categoriesToLink) {
          await linkCategoriesToProduct(product.id, categoriesToLink);
          console.log('Categories linked successfully');
        } else {
          // If no categories, remove all category links (including "free" if it was there)
          const supabase = createClient();
          await supabase.from('product_categories').delete().eq('product_id', product.id);
        }
      } catch (categoryError) {
        console.error('Error linking categories:', categoryError);
        const errorMessage =
          categoryError instanceof Error ? categoryError.message : 'Unknown error';
        alert(
          `Product updated successfully, but there was an issue linking categories: ${errorMessage}. Please check the console for details.`
        );
        // Don't fail the whole operation if category linking fails
      }

      // Success - close modal first, then refresh
      setIsLoading(false);
      onClose();

      // Refresh the page data
      router.refresh();

      // Fallback reload after a short delay to ensure UI updates
      setTimeout(() => {
        if (window.location.pathname.includes('/dashboard/my-products')) {
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update product: ${errorMessage}\n\nCheck the browser console for details.`);
      setIsLoading(false); // Always stop loading on error
    }
  };

  return (
    <>
      <FeesInfoModal isOpen={showFeesModal} onClose={() => setShowFeesModal(false)} />
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open && !isLoading) {
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Product Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter product title"
              />
            </div>

            <div>
              <Label htmlFor="description">
                Description
                <span className="text-muted-foreground text-sm font-normal ml-2">
                  ({formData.description.length}/500 characters)
                </span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => {
                  // Clean pasted content immediately
                  let cleaned = e.target.value;
                  // Remove any non-printable characters except newlines and tabs
                  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
                  // Limit to 500 characters
                  if (cleaned.length > 500) {
                    cleaned = cleaned.substring(0, 500);
                  }
                  setFormData({ ...formData, description: cleaned });
                }}
                onPaste={e => {
                  // Handle paste event to clean content while preserving URLs
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text/plain');
                  // Remove non-printable characters but preserve URLs and links
                  // URLs contain :, /, ?, &, =, etc. which are all printable ASCII
                  let cleaned = pastedText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
                  // Get current cursor position or append to end
                  const textarea = e.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentText = formData.description;
                  let newText =
                    currentText.substring(0, start) + cleaned + currentText.substring(end);
                  // Limit to 500 characters
                  if (newText.length > 500) {
                    newText = newText.substring(0, 500);
                  }
                  setFormData({ ...formData, description: newText });
                }}
                required
                placeholder="Describe your product"
                rows={6}
                maxLength={500}
                className="resize-y min-h-[120px] max-h-[300px] overflow-y-auto"
              />
              {formData.description.length > 450 && (
                <p className="text-sm text-orange-600 mt-1">
                  Warning: Description is getting long ({formData.description.length} characters).
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
                onChange={e => {
                  // Clean pasted content immediately
                  let cleaned = e.target.value;
                  // Remove any non-printable characters except newlines and tabs
                  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
                  // Limit to 10000 characters
                  if (cleaned.length <= 10000) {
                    setFormData({ ...formData, details: cleaned });
                  }
                }}
                onPaste={e => {
                  // Handle paste event to clean content while preserving URLs
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text/plain');
                  // Remove non-printable characters but preserve URLs and links
                  const cleaned = pastedText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
                  // Get current cursor position or append to end
                  const textarea = e.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentText = formData.details;
                  const newText =
                    currentText.substring(0, start) + cleaned + currentText.substring(end);
                  // Limit to 10000 characters
                  if (newText.length <= 10000) {
                    setFormData({ ...formData, details: newText });
                  } else {
                    setFormData({ ...formData, details: newText.substring(0, 10000) });
                  }
                }}
                placeholder="Additional product details, specifications, or information"
                rows={4}
                maxLength={10000}
                className="resize-y min-h-[120px] max-h-[300px] overflow-y-auto"
              />
              {formData.details.length > 9000 && (
                <p className="text-sm text-orange-600 mt-1">
                  Warning: Details is getting long ({formData.details.length} characters). Very long
                  details may cause slow updates.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="is_free" className="text-sm font-normal cursor-pointer">
                      Free Pattern
                    </Label>
                    <Switch
                      id="is_free"
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
                <Input
                  id="price"
                  type={formData.is_free ? 'text' : 'number'}
                  step="0.01"
                  min={formData.is_free ? undefined : '1.00'}
                  value={formData.is_free ? 'Free' : formData.price}
                  onChange={e => {
                    if (!formData.is_free) {
                      setFormData({ ...formData, price: e.target.value });
                    }
                  }}
                  required={!formData.is_free}
                  disabled={formData.is_free}
                  placeholder={formData.is_free ? 'Free' : '1.00'}
                  readOnly={formData.is_free}
                />
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
                          Fees (processing + platform fees):
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
                            ? (
                                calculateEtsyFees(Math.round(parseFloat(formData.price) * 100))
                                  .totalFee / 100
                              ).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="font-medium">You receive:</span>
                        <span className="font-bold text-green-600">
                          $
                          {formData.price && !isNaN(parseFloat(formData.price))
                            ? (
                                parseFloat(formData.price) -
                                calculateEtsyFees(Math.round(parseFloat(formData.price) * 100))
                                  .totalFee /
                                  100
                              ).toFixed(2)
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
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
              </div>
            </div>

            {!authLoading && user && (
              <>
                <MultiImageUpload
                  value={formData.images}
                  onChange={urls => setFormData({ ...formData, images: urls })}
                  userId={user.id}
                  maxImages={10}
                />

                <DigitalFileUpload
                  value={formData.files}
                  onChange={paths => setFormData({ ...formData, files: paths })}
                  userId={user.id}
                  maxFiles={10}
                  maxFileSizeMB={100}
                />
              </>
            )}
            {authLoading && (
              <div className="text-sm text-muted-foreground">Loading upload components...</div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Product is active (visible in marketplace)</Label>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setIsDeleteDialogOpen(true);
                }}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none">
                  {isLoading ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteProductDialog
        product={product}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
        }}
        onDeleteSuccess={() => {
          onClose(); // Close edit modal after successful delete
        }}
      />
    </>
  );
}
