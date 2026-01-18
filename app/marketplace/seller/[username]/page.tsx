import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '@/components/back-button';
import { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

interface SellerPageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url')
    .ilike('username', username)
    .single();

  if (!profile) {
    return {
      title: 'Seller Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const sellerName = profile.full_name || `@${profile.username}`;
  const profileUrl = `${COMPANY_INFO.urls.website}/marketplace/seller/${username}`;
  
  // Use seller's avatar if available, otherwise fall back to default OG image
  const ogImage = profile.avatar_url 
    ? profile.avatar_url 
    : `${COMPANY_INFO.urls.website}/opengraph-image.png`;

  return {
    title: `${sellerName} - Seller Profile | ${COMPANY_INFO.name}`,
    description: `Browse patterns by ${sellerName} on ${COMPANY_INFO.name}. Discover unique sewing and crafting patterns from this independent creator.`,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      title: `${sellerName} - Seller Profile | ${COMPANY_INFO.name}`,
      description: `Browse patterns by ${sellerName} on ${COMPANY_INFO.name}. Discover unique sewing and crafting patterns from this independent creator.`,
      url: profileUrl,
      type: 'profile',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${sellerName} - ${COMPANY_INFO.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${sellerName} - Seller Profile`,
      description: `Browse patterns by ${sellerName} on ${COMPANY_INFO.name}.`,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // First, try to find the user by username
  let profile = null;
  let profileError = null;

  // Check if the param is a UUID (for users without username)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    username
  );

  if (isUUID) {
    // Look up by ID
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio')
      .eq('id', username)
      .single();
    profile = data;
    profileError = error;
  } else {
    // Look up by username
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio')
      .ilike('username', username)
      .single();
    profile = data;
    profileError = error;
  }

  if (profileError || !profile) {
    notFound();
  }

  // Fetch products by this seller
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(
      `
      *,
      profiles:user_id (
        full_name,
        username,
        avatar_url
      )
    `
    )
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
      <BackButton />

      {/* Seller Profile Header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.username || 'Seller'}
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-300 to-rose-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                  {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Seller Info */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                {profile.username ? `@${profile.username}` : sellerName}
              </h1>
              {profile.full_name && profile.username && (
                <p className="text-muted-foreground text-lg">{profile.full_name}</p>
              )}
              <p className="text-muted-foreground mt-2 mb-4">
                {productCount} {productCount === 1 ? 'product' : 'products'} available
              </p>

              {/* Bio */}
              {profile.bio ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-4">
                  This seller hasn't added a bio yet.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map(product => (
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
