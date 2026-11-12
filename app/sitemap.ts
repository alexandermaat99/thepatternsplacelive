import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';
import { getFabricCatalogRows, isFabricSoldOut } from '@/lib/fabric-catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = COMPANY_INFO.urls.website;
  const supabase = await createClient();

  const [productsResult, fabrics] = await Promise.all([
    supabase
      .from('products')
      .select('id, updated_at, profiles:user_id (username)')
      .eq('is_active', true),
    getFabricCatalogRows(),
  ]);

  if (productsResult.error) {
    console.error('Error fetching products for sitemap:', productsResult.error);
  }
  const products = productsResult.data ?? [];

  // No lastModified on static pages: a timestamp that always says "now"
  // teaches Google to ignore our lastmod values entirely.
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/marketplace`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/fabric`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/marketplace/sell`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/fees`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/marketplace/difficulty-levels`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/marketplace/watermarking-info`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map(product => ({
    url: `${baseUrl}/marketplace/product/${product.id}`,
    ...(product.updated_at && { lastModified: new Date(product.updated_at) }),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Seller shop pages, only for sellers with at least one active listing.
  const sellerUsernames = new Set(
    products
      .map(product => (product.profiles as { username?: string | null } | null)?.username)
      .filter((username): username is string => !!username)
  );
  const sellerPages: MetadataRoute.Sitemap = [...sellerUsernames].map(username => ({
    url: `${baseUrl}/marketplace/seller/${encodeURIComponent(username)}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // In-stock fabric only; sold-out pages stay reachable but aren't promoted.
  const fabricPages: MetadataRoute.Sitemap = fabrics
    .filter(fabric => !isFabricSoldOut(fabric.current_quantity))
    .map(fabric => ({
      url: `${baseUrl}/fabric/${encodeURIComponent(fabric.sku)}`,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  return [...staticPages, ...productPages, ...sellerPages, ...fabricPages];
}
