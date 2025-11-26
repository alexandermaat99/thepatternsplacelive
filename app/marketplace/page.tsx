import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function MarketplacePage() {
  const supabase = await createClient();
  
  // Fetch products from the database
  // Try with profiles first, fallback to products only if that fails
  let { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (
        full_name,
        username,
        avatar_url
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // If there's an error with the join, try fetching products without profiles
  if (error) {
    console.error('Error fetching products with profiles:', error?.message || error?.code || 'Unknown error');
    
    // Fallback: fetch products without the profiles join
    const fallbackResult = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (!fallbackResult.error) {
      products = fallbackResult.data || [];
      error = null;
      console.log('Successfully fetched products without profiles');
    } else {
      console.error('Error fetching products (fallback):', fallbackResult.error?.message || fallbackResult.error?.code || 'Unknown error');
      products = [];
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">
              Discover and shop beautiful patterns from talented creators
            </p>
          </div>
          {/* <Link href="/marketplace/sell" className="self-start sm:self-auto">
            <Button size="default" className="w-full sm:w-auto">Share Your Pattern</Button>
          </Link> */}
        </div>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-3">
                Ready to explore patterns?
              </h3>
              <p className="text-muted-foreground mb-6">
                The marketplace is waiting for your first pattern! Be the one to share something amazing.
              </p>
              <Link href="/marketplace/sell">
                <Button>List Your First Pattern</Button>
              </Link>
            </div>
          </div>
        )}
    </div>
  );
} 