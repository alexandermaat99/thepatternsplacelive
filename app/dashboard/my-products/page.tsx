import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Plus } from 'lucide-react';
import Link from 'next/link';
import { ProductActions } from '@/components/product-actions';
import { BackButton } from '@/components/back-button';

export default async function MyProductsPage() {
  const supabase = await createClient();

  // Get the current user
  // Auth is handled by the layout, so user should exist
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If no user (shouldn't happen due to layout protection), return null
  if (authError || !user) {
    return null;
  }

  // Fetch user's products from the database with separate queries for better performance
  // No need to join profiles since we already know the user
  const [activeProductsResult, inactiveProductsResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', false)
      .order('created_at', { ascending: false }),
  ]);

  const activeProducts = activeProductsResult.data || [];
  const inactiveProducts = inactiveProductsResult.data || [];
  const products = [...activeProducts, ...inactiveProducts];

  if (activeProductsResult.error) {
    console.error('Error fetching active products:', activeProductsResult.error);
  }
  if (inactiveProductsResult.error) {
    console.error('Error fetching inactive products:', inactiveProductsResult.error);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton />
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            My Products
          </h1>
          <p className="text-muted-foreground">Manage your products and track their performance</p>
        </div>
        <Link href="/marketplace/sell" className="w-full sm:w-auto">
          <Button className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProducts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inactiveProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Products */}
      {activeProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Active Products</h2>
            <Badge variant="default">{activeProducts.length}</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {activeProducts.map(product => (
              <div key={product.id} className="relative">
                <ProductCard product={product} hideFavorite={true} />
                <ProductActions product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Products */}
      {inactiveProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Inactive Products</h2>
            <Badge variant="secondary">{inactiveProducts.length}</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {inactiveProducts.map(product => (
              <div key={product.id} className="relative opacity-60">
                <ProductCard product={product} hideFavorite={true} />
                <ProductActions product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!products || products.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">
              Start selling by listing your first product in our marketplace.
            </p>
            <Link href="/marketplace/sell">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                List Your First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
