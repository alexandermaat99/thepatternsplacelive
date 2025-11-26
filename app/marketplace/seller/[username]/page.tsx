import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

interface SellerPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // First, find the user by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .ilike('username', username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch products by this seller
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
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching seller products:', productsError);
  }

  const sellerName = profile.full_name || `@${profile.username}`;
  const productCount = products?.length || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {profile.username ? `@${profile.username}` : sellerName}
        </h1>
        {profile.full_name && profile.username && (
          <p className="text-muted-foreground">{profile.full_name}</p>
        )}
        <p className="text-muted-foreground mt-2">
          {productCount} {productCount === 1 ? 'product' : 'products'} available
        </p>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No products available
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              This seller hasn't listed any products yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

