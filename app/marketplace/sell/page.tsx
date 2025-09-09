'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';

export default function SellPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string>('unknown');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    image_url: ''
  });

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user profile with Stripe account info
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profile);
        
        // Check Stripe account status if we have an account ID
        if (profile?.stripe_account_id) {
          try {
            const response = await fetch('/api/check-stripe-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: profile.stripe_account_id })
            });
            const { status } = await response.json();
            setStripeAccountStatus(status);
          } catch (error) {
            console.error('Error checking Stripe account status:', error);
            setStripeAccountStatus('error');
          }
        }
      }
      
      setLoading(false);
    };

    fetchUserAndProfile();
  }, []);

  const isConnected = Boolean(profile?.stripe_account_id);
  const isFullyOnboarded = stripeAccountStatus === 'onboarded';
  
  // Debug logging
  console.log('Profile:', profile);
  console.log('Stripe Account ID:', profile?.stripe_account_id);
  console.log('Stripe Account Status:', stripeAccountStatus);
  console.log('Is Connected:', isConnected);
  console.log('Is Fully Onboarded:', isFullyOnboarded);
  
  // Check if we should show the connect button or the form
  const shouldShowConnectButton = !isConnected || !isFullyOnboarded;

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
          image_url: formData.image_url || null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              You must be logged in to list products.
            </p>
            <Button onClick={() => router.push('/auth/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">List Your Product</CardTitle>
          </CardHeader>
          <CardContent>
            {shouldShowConnectButton ? (
              <div className="space-y-4">
                {!isConnected ? (
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
                      Status: {stripeAccountStatus}<br/>
                      Fully Onboarded: {isFullyOnboarded ? 'Yes' : 'No'}
                    </p>
                    <div className="mt-2 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/check-stripe-account', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ accountId: profile.stripe_account_id })
                            });
                            const { status } = await response.json();
                            setStripeAccountStatus(status);
                          } catch (error) {
                            console.error('Error refreshing status:', error);
                          }
                        }}
                      >
                        Refresh Status
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase
                            .from('profiles')
                            .update({ stripe_account_id: null })
                            .eq('id', user.id);
                          window.location.reload();
                        }}
                      >
                        Clear Account ID
                      </Button>
                    </div>
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

                <div>
                  <Label htmlFor="image_url">Image URL (optional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'List Product'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 