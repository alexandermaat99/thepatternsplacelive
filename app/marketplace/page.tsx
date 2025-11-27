import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters';
import { ActiveFilters } from '@/components/marketplace/active-filters';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Category } from '@/lib/types/categories';

interface MarketplacePageProps {
  searchParams: Promise<{
    q?: string;
    categories?: string;
    difficulty?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  }>;
}

/**
 * Helper function to check if a product matches all search words
 */
function productMatchesSearchWords(product: any, searchWords: string[]): boolean {
  if (searchWords.length === 0) return true;
  
  const searchableText = [
    product.title?.toLowerCase() || '',
    product.description?.toLowerCase() || '',
    product.profiles?.username?.toLowerCase() || '',
    ...(product.product_categories || []).map((pc: any) => 
      pc?.category?.name?.toLowerCase() || ''
    )
  ].join(' ');
  
  return searchWords.every(word => 
    searchableText.includes(word.toLowerCase())
  );
}

async function MarketplaceContent({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Tokenize search query early
  const searchWords = params.q?.trim().split(/\s+/).filter(w => w.length > 0) || [];

  // Execute ALL independent queries in parallel
  const [
    categoriesWithProducts,
    priceRangeData,
    categoryFilterData,
    usernameSearchData,
    categorySearchData,
  ] = await Promise.all([
    // Get categories that have products
    (async () => {
      const { data: productCategories } = await supabase
        .from('product_categories')
        .select('category_id, product:products!inner(id, is_active)')
        .eq('product.is_active', true);

      const categoryIds = Array.from(
        new Set(productCategories?.map((pc: any) => pc.category_id).filter(Boolean) || [])
      );

      if (categoryIds.length === 0) return [];

      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug, description, display_order, is_active')
        .in('id', categoryIds)
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      return (categories || []) as Category[];
    })(),
    
    // Get price range
    supabase
      .from('products')
      .select('price')
      .eq('is_active', true)
      .limit(10000),
    
    // Get category filter product IDs (if categories filter is active)
    params.categories
      ? (async () => {
          const categorySlugs = params.categories!.split(',').filter(Boolean).map(s => s.toLowerCase());
          if (categorySlugs.length === 0) return null;
          
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .in('slug', categorySlugs)
            .eq('is_active', true);
          
          const categoryIds = categoryData?.map(c => c.id) || [];
          if (categoryIds.length === 0) return [];
          
          const { data: productCategoryData } = await supabase
            .from('product_categories')
            .select('product_id')
            .in('category_id', categoryIds);
          
          const productIds = productCategoryData?.map((pc: any) => pc.product_id).filter(Boolean) || [];
          return productIds.length > 0 ? productIds : null;
        })()
      : Promise.resolve(null),
    
    // Get username search IDs (if search is active)
    searchWords.length > 0
      ? supabase
          .from('profiles')
          .select('id')
          .or(searchWords.map(word => `username.ilike.%${word}%`).join(','))
          .then(result => result.data?.map(p => p.id) || [])
      : Promise.resolve([]),
    
    // Get category search IDs (if search is active)
    searchWords.length > 0
      ? supabase
          .from('categories')
          .select('id')
          .eq('is_active', true)
          .or(searchWords.map(word => `name.ilike.%${word}%`).join(','))
          .then(result => result.data?.map(c => c.id) || [])
      : Promise.resolve([]),
  ]);

  const categories = categoriesWithProducts;
  const prices = priceRangeData.data?.map(p => Number(p.price)) || [0];
  const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices, 0)) : 0;
  const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices, 100)) : 100;

  // Get product IDs from category search
  let categorySearchProductIds: string[] = [];
  if (categorySearchData && categorySearchData.length > 0) {
    const { data: categoryProductsData } = await supabase
      .from('product_categories')
      .select('product_id')
      .in('category_id', categorySearchData);
    
    categorySearchProductIds = categoryProductsData?.map((cp: any) => cp.product_id).filter(Boolean) || [];
  }

  // Build main product query with all filters
  let query = supabase
    .from('products')
    .select(`
      *,
      profiles:user_id (full_name, username, avatar_url),
      product_categories (category:categories (id, name, slug))
    `)
    .eq('is_active', true);

  // Apply category filter
  if (categoryFilterData !== null) {
    if (categoryFilterData && categoryFilterData.length > 0) {
      query = query.in('id', categoryFilterData);
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  }

  // Apply text search
  if (searchWords.length > 0) {
    const searchConditions: string[] = [];
    searchWords.forEach(word => {
      searchConditions.push(`title.ilike.%${word}%`);
      searchConditions.push(`description.ilike.%${word}%`);
    });
    query = query.or(searchConditions.join(','));
  }

  // Apply difficulty filter
  if (params.difficulty) {
    const difficulties = params.difficulty.split(',').filter(Boolean);
    if (difficulties.length > 0) {
      query = query.in('difficulty', difficulties);
    }
  }

  // Apply price filter
  if (params.minPrice) {
    query = query.gte('price', params.minPrice);
  }
  if (params.maxPrice) {
    query = query.lte('price', params.maxPrice);
  }

  // Apply sorting
  const sortBy = params.sort || 'newest';
  switch (sortBy) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'price-low':
      query = query.order('price', { ascending: true });
      break;
    case 'price-high':
      query = query.order('price', { ascending: false });
      break;
    case 'title-asc':
      query = query.order('title', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Execute main query AND additional queries in parallel
  const productQueries = [query];

  // Username products query
  if (usernameSearchData && usernameSearchData.length > 0) {
    let usernameQuery = supabase
      .from('products')
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url),
        product_categories (category:categories (id, name, slug))
      `)
      .eq('is_active', true)
      .in('user_id', usernameSearchData);

    if (categoryFilterData !== null) {
      if (categoryFilterData && categoryFilterData.length > 0) {
        usernameQuery = usernameQuery.in('id', categoryFilterData);
      } else {
        usernameQuery = usernameQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (params.difficulty) {
      const difficulties = params.difficulty.split(',').filter(Boolean);
      if (difficulties.length > 0) {
        usernameQuery = usernameQuery.in('difficulty', difficulties);
      }
    }

    if (params.minPrice) {
      usernameQuery = usernameQuery.gte('price', params.minPrice);
    }
    if (params.maxPrice) {
      usernameQuery = usernameQuery.lte('price', params.maxPrice);
    }

    switch (sortBy) {
      case 'oldest':
        usernameQuery = usernameQuery.order('created_at', { ascending: true });
        break;
      case 'price-low':
        usernameQuery = usernameQuery.order('price', { ascending: true });
        break;
      case 'price-high':
        usernameQuery = usernameQuery.order('price', { ascending: false });
        break;
      case 'title-asc':
        usernameQuery = usernameQuery.order('title', { ascending: true });
        break;
      case 'title-desc':
        usernameQuery = usernameQuery.order('title', { ascending: false });
        break;
      default:
        usernameQuery = usernameQuery.order('created_at', { ascending: false });
    }

    productQueries.push(usernameQuery);
  }

  // Category search products query
  if (categorySearchProductIds.length > 0) {
    let categoryQuery = supabase
      .from('products')
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url),
        product_categories (category:categories (id, name, slug))
      `)
      .eq('is_active', true)
      .in('id', categorySearchProductIds);

    if (categoryFilterData !== null) {
      if (categoryFilterData && categoryFilterData.length > 0) {
        categoryQuery = categoryQuery.in('id', categoryFilterData);
      } else {
        categoryQuery = categoryQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (params.difficulty) {
      const difficulties = params.difficulty.split(',').filter(Boolean);
      if (difficulties.length > 0) {
        categoryQuery = categoryQuery.in('difficulty', difficulties);
      }
    }

    if (params.minPrice) {
      categoryQuery = categoryQuery.gte('price', params.minPrice);
    }
    if (params.maxPrice) {
      categoryQuery = categoryQuery.lte('price', params.maxPrice);
    }

    switch (sortBy) {
      case 'oldest':
        categoryQuery = categoryQuery.order('created_at', { ascending: true });
        break;
      case 'price-low':
        categoryQuery = categoryQuery.order('price', { ascending: true });
        break;
      case 'price-high':
        categoryQuery = categoryQuery.order('price', { ascending: false });
        break;
      case 'title-asc':
        categoryQuery = categoryQuery.order('title', { ascending: true });
        break;
      case 'title-desc':
        categoryQuery = categoryQuery.order('title', { ascending: false });
        break;
      default:
        categoryQuery = categoryQuery.order('created_at', { ascending: false });
    }

    productQueries.push(categoryQuery);
  }

  // Execute ALL product queries in parallel
  const productResults = await Promise.all(productQueries);
  
  let products = productResults[0]?.data || [];
  if (productResults[0]?.error) {
    console.error('Product query error:', productResults[0].error.message);
    products = [];
  }

  // Combine username products
  if (productResults[1]) {
    const usernameProducts = productResults[1].data || [];
    const existingIds = new Set(products.map((p: any) => p.id));
    const unique = usernameProducts.filter((p: any) => !existingIds.has(p.id));
    products = [...products, ...unique];
    unique.forEach((p: any) => existingIds.add(p.id));
  }

  // Combine category search products
  if (productResults[2]) {
    const categoryProducts = productResults[2].data || [];
    const existingIds = new Set(products.map((p: any) => p.id));
    const unique = categoryProducts.filter((p: any) => !existingIds.has(p.id));
    products = [...products, ...unique];
  }

  // Filter for multi-word matches
  if (searchWords.length > 1 && products) {
    products = products.filter((product: any) => 
      productMatchesSearchWords(product, searchWords)
    );
  }

  // Re-sort combined results if needed
  if (productResults.length > 1 && products) {
    switch (sortBy) {
      case 'oldest':
        products.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'price-low':
        products.sort((a: any, b: any) => Number(a.price) - Number(b.price));
        break;
      case 'price-high':
        products.sort((a: any, b: any) => Number(b.price) - Number(a.price));
        break;
      case 'title-asc':
        products.sort((a: any, b: any) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        products.sort((a: any, b: any) => b.title.localeCompare(a.title));
        break;
      default:
        products.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }

  const productsCount = products.length;
  const hasFilters = !!(params.q || params.categories || params.difficulty || params.minPrice || params.maxPrice || (params.sort && params.sort !== 'newest'));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and shop beautiful patterns from talented creators
          </p>
        </div>
      </div>

      {/* Filters and Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <MarketplaceFilters 
              categories={categories}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </Suspense>
        </aside>

        {/* Products Section */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          <Suspense fallback={null}>
            <ActiveFilters categories={categories} />
          </Suspense>

          {/* Results Count */}
          {products.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              {productsCount} {productsCount === 1 ? 'pattern' : 'patterns'} found
            </p>
          )}

          {/* Products Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-3">
                  {hasFilters ? 'No patterns found' : 'Ready to explore patterns?'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {hasFilters
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'The marketplace is waiting for your first pattern! Be the one to share something amazing.'}
                </p>
                {!hasFilters && (
                  <Link href="/marketplace/sell">
                    <Button>List Your First Pattern</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function MarketplacePage(props: MarketplacePageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded w-full max-w-2xl mx-auto"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 h-96 bg-muted rounded"></div>
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-96 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <MarketplaceContent {...props} />
    </Suspense>
  );
}
