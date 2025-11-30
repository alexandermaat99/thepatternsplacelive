import { createClient } from '@/lib/supabase/server';
import { ProductDetail } from '@/components/marketplace/product-detail';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch product and current user in parallel
  const [productResult, userResult] = await Promise.all([
    supabase
      .from('products')
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          username,
          avatar_url
        ),
        product_categories (
          category:categories (
            id,
            name,
            slug
          )
        )
      `
      )
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
  ]);

  const { data: product, error } = productResult;
  const userId = userResult.data.user?.id || null;

  if (error || !product) {
    notFound();
  }

  // Record the product view (don't await - fire and forget for performance)
  // Only track if viewer is not the product owner
  if (userId !== product.user_id) {
    supabase.rpc('record_product_view', {
      p_product_id: id,
      p_viewer_id: userId,
    }).then(() => {
      // View recorded successfully (or rate-limited)
    }).catch(() => {
      // Silently fail - view tracking shouldn't break the page
    });
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <ProductDetail product={product} />
    </div>
  );
}
