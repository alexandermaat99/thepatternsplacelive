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
import { ArrowLeft } from 'lucide-react';
import type { UserProfile, StripeAccountStatus } from '@/lib/auth-helpers';

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
    price: '',
    category: '',
    images: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to list a product');
      }

      const supabase = createClient();
      const { error } = await supabase
        .from('products')
        .insert({
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          currency: 'USD',
          category: formData.category,
          images: formData.images.length > 0 ? formData.images : [],
          image_url: formData.images[0] || null,
          user_id: user.id,
          is_active: true
        });

      if (error) throw error;

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
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
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
                  Your Stripe account is not fully set up yet. Please complete the onboarding process.
                </p>
              )}
              <StripeConnectButton userId={user.id} />
              {profile?.stripe_account_id && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Debug Info:</strong><br/>
                    Account ID: {profile.stripe_account_id}<br/>
                    Status: {stripeStatus.status}<br/>
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter product title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Describe your product"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  placeholder="e.g., Electronics, Clothing, Books"
                />
              </div>

              {user && (
                <MultiImageUpload
                  value={formData.images}
                  onChange={(urls) => setFormData({ ...formData, images: urls })}
                  userId={user.id}
                  maxImages={10}
                />
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

