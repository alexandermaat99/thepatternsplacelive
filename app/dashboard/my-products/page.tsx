import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProductActions } from '@/components/product-actions';

export default async function MyProductsPage() {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }
  
  // Fetch user's products from the database
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
  }

  const activeProducts = products?.filter(p => p.is_active) || [];
  const inactiveProducts = products?.filter(p => !p.is_active) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="The Patterns Place" showMarketplaceLinks={true} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              My Products
            </h1>
            <p className="text-muted-foreground">
              Manage your products and track their performance
            </p>
          </div>
          <Link href="/marketplace/sell">
            <Button className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProducts.map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard product={product} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inactiveProducts.map((product) => (
                <div key={product.id} className="relative opacity-60">
                  <ProductCard product={product} />
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
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No products yet
              </h3>
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
    </div>
  );
}
