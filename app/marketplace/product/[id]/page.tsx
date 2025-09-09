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
  
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductDetail product={product} />
      </div>
    </div>
  );
} 