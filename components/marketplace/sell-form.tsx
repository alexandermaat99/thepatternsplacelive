'use client';

import { useState } from 'react';
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
import { ArrowLeft } from 'lucide-react';
import type { UserProfile, StripeAccountStatus } from '@/lib/auth-helpers';
import { DIFFICULTY_LEVELS } from '@/lib/constants';

interface SellFormProps {
  user: any;
  profile: UserProfile | null;
  stripeStatus: StripeAccountStatus;
  canSell: boolean;
}

export function SellForm({ user, profile, stripeStatus, canSell }: SellFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    details: '',
    price: '',
    category: '',
    difficulty: '' as string,
    images: [] as string[],
    files: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to list a product');
      }

      const supabase = createClient();
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          title: formData.title,
          description: formData.description,
          details: formData.details || null,
          price: parseFloat(formData.price),
          currency: 'USD',
          category: formData.category, // Keep for backward compatibility
          difficulty: formData.difficulty || null,
          images: formData.images.length > 0 ? formData.images : [],
          image_url: formData.images[0] || null,
          files: formData.files.length > 0 ? formData.files : [],
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Link categories to the product (comma-separated input)
      if (formData.category && product) {
        try {
          await linkCategoriesToProduct(product.id, formData.category);
          console.log('Categories linked successfully');
        } catch (categoryError) {
          console.error('Error linking categories:', categoryError);
          const errorMessage = categoryError instanceof Error ? categoryError.message : 'Unknown error';
          alert(`Product created successfully, but there was an issue linking categories: ${errorMessage}. You can edit the product to add categories later.`);
          // Don't fail the whole operation if category linking fails
        }
      }

      router.push('/marketplace');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">List Your Product</CardTitle>
        </CardHeader>
        <CardContent>
          {!canSell ? (
            <div className="space-y-4">
              {!stripeStatus.isConnected ? (
                <p className="text-red-500 font-medium">
                  You must connect your Stripe account before listing a product.
                </p>
              ) : (
                <p className="text-orange-500 font-medium">
                  Your Stripe account is not fully set up yet. Please complete the onboarding
                  process.
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  placeholder="Describe your product"
                  rows={4}
                />
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
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <CategoryInput
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
              />

              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="">Select difficulty level</option>
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {user && (
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'List Product'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
