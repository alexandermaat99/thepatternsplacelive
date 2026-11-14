import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';

/** Newest patterns. Hidden listings are excluded by RLS. Hidden if none. */
export async function HomeNewPatterns() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select(
      'id, title, description, price, currency, image_url, images, category, difficulty, is_free, created_at, profiles:user_id (full_name, username, avatar_url, founding_designer), product_categories (category:categories (id, name, slug))'
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8);
  if (!products?.length) return null;

  return (
    <section aria-labelledby="home-patterns" className="border-b">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-patterns" className="text-2xl sm:text-3xl font-bold">New patterns</h2>
            <p className="text-muted-foreground mt-1">
              PDF patterns from independent designers. Download instantly and print at home.
            </p>
          </div>
          <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            Browse all patterns <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product as never} />
          ))}
        </div>
        {products.length < 4 && (
          <p className="mt-6 text-sm text-muted-foreground">
            We&apos;re just getting started, and new designers are joining.{' '}
            <Link href="/marketplace/sell" className="underline underline-offset-4">
              Are you a pattern designer?
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
