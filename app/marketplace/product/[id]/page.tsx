import { createClient } from '@/lib/supabase/server';
import { ProductDetail } from '@/components/marketplace/product-detail';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(
      `
      title,
      description,
      price,
      image_url,
      profiles:user_id (username, full_name),
      product_categories (category:categories (name))
    `
    )
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const categories =
    (product.product_categories as any[])
      ?.map((pc: any) => pc?.category?.name)
      .filter(Boolean)
      .join(', ') || 'Pattern';
  const sellerName =
    (product.profiles as any)?.full_name || (product.profiles as any)?.username || 'Creator';
  const price = `$${Number(product.price).toFixed(2)}`;
  const description = product.description
    ? `${product.description.substring(0, 155)}...`
    : `Buy ${product.title} - ${categories} pattern by ${sellerName} for ${price}. Digital download available instantly.`;

  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${COMPANY_INFO.urls.website}${product.image_url}`
    : `${COMPANY_INFO.urls.website}/opengraph-image.png`;

  return {
    title: product.title,
    description,
    keywords: [
      product.title,
      categories,
      'sewing pattern',
      'digital pattern',
      'PDF pattern',
      'crafting pattern',
      sellerName,
    ],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${product.title} | ${COMPANY_INFO.name}`,
      description,
      type: 'website',
      url: `${COMPANY_INFO.urls.website}/marketplace/product/${id}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: [imageUrl],
    },
  };
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
    Promise.resolve(
      supabase.rpc('record_product_view', {
        p_product_id: id,
        p_viewer_id: userId,
      })
    ).catch(() => {
      // Silently fail - view tracking shouldn't break the page
    });
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <ProductDetail product={product} />
    </div>
  );
}
