import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function FavoritesPage() {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect(`/auth/login?redirect=${encodeURIComponent('/dashboard/favorites')}`);
  }

  // Fetch user's favorite product IDs
  const { data: favoritesData, error: favoritesError } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id);

  if (favoritesError) {
    console.error('Error fetching favorites:', favoritesError);
  }

  const favoriteProductIds = favoritesData?.map(f => f.product_id) || [];

  // If no favorites, show empty state
  if (favoriteProductIds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Favorites</h1>
          <p className="text-muted-foreground">
            Products you've saved for later
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No favorites yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Start exploring the marketplace and click the heart icon on products you like to save them here.
            </p>
            <Link href="/marketplace">
              <Button>
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the actual product details for favorited products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (
        full_name,
        username,
        avatar_url
      )
    `)
    .in('id', favoriteProductIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching favorite products:', productsError);
  }

  // Filter out any products that might have been deleted or deactivated
  const validProducts = products?.filter(p => favoriteProductIds.includes(p.id)) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Favorites</h1>
        <p className="text-muted-foreground">
          {validProducts.length} {validProducts.length === 1 ? 'pattern' : 'patterns'} saved for later
        </p>
      </div>

      {validProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {validProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-3">
              No favorites yet
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Start exploring the marketplace and heart patterns you love! They'll show up here for easy access.
            </p>
            <Link href="/marketplace">
              <Button>
                Explore Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

