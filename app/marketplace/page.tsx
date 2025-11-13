import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';
import Link from 'next/link';

export default async function MarketplacePage() {
  const supabase = await createClient();
  
  // Fetch products from the database
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Products fetched successfully:', products);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="The Patterns Place" showMarketplaceLinks={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <Link href="/marketplace/sell">
            <Button>Sell Your Product</Button>
          </Link>
        </div>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No products available
            </h3>
            <p className="text-muted-foreground">
              Be the first to list a product in our marketplace!
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 