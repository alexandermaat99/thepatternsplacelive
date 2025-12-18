import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/marketplace/product-card';
import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters';
import { ActiveFilters } from '@/components/marketplace/active-filters';
import { MarketplacePagination } from '@/components/marketplace/marketplace-pagination';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Category } from '@/lib/types/categories';
import { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categories?: string;
    difficulty?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
    free?: string;
  }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasSearchParams = Boolean(
    params.q ||
      params.categories ||
      params.difficulty ||
      params.minPrice ||
      params.maxPrice ||
      params.sort ||
      params.page ||
      params.free
  );

  return {
    title: 'Marketplace',
    description:
      'Browse and discover unique sewing and crafting patterns from independent creators. Find digital patterns for your next project.',
    robots: hasSearchParams
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title: `Marketplace | ${COMPANY_INFO.name}`,
      description:
        'Browse and discover unique sewing and crafting patterns from independent creators.',
      url: `${COMPANY_INFO.urls.website}${COMPANY_INFO.urls.marketplace}`,
      type: 'website',
    },
    alternates: {
      canonical: `${COMPANY_INFO.urls.website}${COMPANY_INFO.urls.marketplace}`,
    },
  };
}

interface MarketplacePageProps {
  searchParams: Promise<{
    q?: string;
    categories?: string;
    difficulty?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
    free?: string;
  }>;
}

const PRODUCTS_PER_PAGE = 24;

/**
 * Helper function to check if a product matches all search words
 */
function productMatchesSearchWords(product: any, searchWords: string[]): boolean {
  if (searchWords.length === 0) return true;

  const searchableText = [
    product.title?.toLowerCase() || '',
    product.description?.toLowerCase() || '',
    product.profiles?.username?.toLowerCase() || '',
    ...(product.product_categories || []).map((pc: any) => pc?.category?.name?.toLowerCase() || ''),
  ].join(' ');

  return searchWords.every(word => searchableText.includes(word.toLowerCase()));
}

async function MarketplaceContent({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  // Tokenize search query early
  const searchWords =
    params.q
      ?.trim()
      .split(/\s+/)
      .filter(w => w.length > 0) || [];

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
    supabase.from('products').select('price').eq('is_active', true).limit(10000),

    // Get category filter product IDs (if categories filter is active)
    params.categories
      ? (async () => {
          const categorySlugs = params
            .categories!.split(',')
            .filter(Boolean)
            .map(s => s.toLowerCase());
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

          const productIds =
            productCategoryData?.map((pc: any) => pc.product_id).filter(Boolean) || [];
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

    categorySearchProductIds =
      categoryProductsData?.map((cp: any) => cp.product_id).filter(Boolean) || [];
  }

  // Build main product query with all filters
  let query = supabase
    .from('products')
    .select(
      `
      *,
      profiles:user_id (full_name, username, avatar_url),
      product_categories (category:categories (id, name, slug))
    `
    )
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

  // Free filter is now handled via categories - if "free" category is selected,
  // it will be included in categoryFilterData automatically via the category filter system

  // Apply price filter
  if (params.minPrice) {
    query = query.gte('price', params.minPrice);
  }
  if (params.maxPrice) {
    query = query.lte('price', params.maxPrice);
  }

  // Apply sorting (for non-popular sorts, we can sort in the query)
  const sortBy = params.sort || 'popular';
  if (sortBy !== 'popular') {
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
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
    }
  } else {
    // For popular sort, we'll sort after fetching all data
    query = query.order('created_at', { ascending: false });
  }

  // Execute main query AND additional queries in parallel
  const productQueries = [query];

  // Username products query
  if (usernameSearchData && usernameSearchData.length > 0) {
    let usernameQuery = supabase
      .from('products')
      .select(
        `
        *,
        profiles:user_id (full_name, username, avatar_url),
        product_categories (category:categories (id, name, slug))
      `
      )
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

    if (sortBy !== 'popular') {
      switch (sortBy) {
        case 'oldest':
          usernameQuery = usernameQuery.order('created_at', { ascending: true });
          break;
        case 'newest':
          usernameQuery = usernameQuery.order('created_at', { ascending: false });
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
      }
    } else {
      usernameQuery = usernameQuery.order('created_at', { ascending: false });
    }

    productQueries.push(usernameQuery);
  }

  // Category search products query
  if (categorySearchProductIds.length > 0) {
    let categoryQuery = supabase
      .from('products')
      .select(
        `
        *,
        profiles:user_id (full_name, username, avatar_url),
        product_categories (category:categories (id, name, slug))
      `
      )
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

    if (sortBy !== 'popular') {
      switch (sortBy) {
        case 'oldest':
          categoryQuery = categoryQuery.order('created_at', { ascending: true });
          break;
        case 'newest':
          categoryQuery = categoryQuery.order('created_at', { ascending: false });
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
      }
    } else {
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
    products = products.filter((product: any) => productMatchesSearchWords(product, searchWords));
  }

  // For popular sort, fetch engagement data and calculate scores
  let popularityScores: Map<string, number> = new Map();
  if (sortBy === 'popular' && products && products.length > 0) {
    const productIds = products.map((p: any) => p.id);

    // Fetch favorites, orders, and views counts in parallel
    const [favoritesData, ordersData, viewsData] = await Promise.all([
      supabase.from('favorites').select('product_id').in('product_id', productIds),
      supabase
        .from('orders')
        .select('product_id')
        .in('product_id', productIds)
        .eq('status', 'completed'),
      supabase
        .from('product_views')
        .select('product_id')
        .in('product_id', productIds)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Count occurrences for each product
    const favoriteCounts: Map<string, number> = new Map();
    const orderCounts: Map<string, number> = new Map();
    const viewCounts: Map<string, number> = new Map();

    (favoritesData.data || []).forEach((f: any) => {
      favoriteCounts.set(f.product_id, (favoriteCounts.get(f.product_id) || 0) + 1);
    });

    (ordersData.data || []).forEach((o: any) => {
      orderCounts.set(o.product_id, (orderCounts.get(o.product_id) || 0) + 1);
    });

    (viewsData.data || []).forEach((v: any) => {
      viewCounts.set(v.product_id, (viewCounts.get(v.product_id) || 0) + 1);
    });

    // Calculate popularity score for each product
    // Formula: views × 0.1 + favorites × 2 + purchases × 5 + freshness_bonus
    const now = Date.now();
    products.forEach((product: any) => {
      const views = viewCounts.get(product.id) || 0;
      const favorites = favoriteCounts.get(product.id) || 0;
      const orders = orderCounts.get(product.id) || 0;

      // Freshness bonus: 10 points at 0 days, decaying to 0 over 30 days
      const ageInDays = (now - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const freshnessBonus = Math.max(0, 10 - ageInDays / 3);

      const score = views * 0.1 + favorites * 2 + orders * 5 + freshnessBonus;
      popularityScores.set(product.id, score);
    });
  }

  // Re-sort combined results
  if (products && (productResults.length > 1 || sortBy === 'popular')) {
    switch (sortBy) {
      case 'popular':
        products.sort((a: any, b: any) => {
          const scoreA = popularityScores.get(a.id) || 0;
          const scoreB = popularityScores.get(b.id) || 0;
          return scoreB - scoreA;
        });
        break;
      case 'oldest':
        products.sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'newest':
        products.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
    }
  }

  // Get total count before pagination
  const totalProducts = products.length;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  // Apply pagination
  const paginatedProducts = products.slice(from, to + 1);

  const hasFilters = !!(
    params.q ||
    params.categories ||
    params.difficulty ||
    params.minPrice ||
    params.maxPrice ||
    (params.sort && params.sort !== 'popular')
  );

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
              hasFilters={hasFilters}
              productsCount={totalProducts}
            />
          </Suspense>
        </aside>

        {/* Products Section */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          <Suspense fallback={null}>
            <ActiveFilters categories={categories} />
          </Suspense>

          {/* Products Grid */}
          {paginatedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <MarketplacePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  searchParams={params}
                />
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-3">
                  {hasFilters ? 'No patterns found' : 'Ready to explore patterns?'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {hasFilters
                    ? "Try adjusting your search or filters to find what you're looking for."
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
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded w-full max-w-2xl mx-auto"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 h-96 bg-muted rounded"></div>
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-96 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <MarketplaceContent {...props} />
    </Suspense>
  );
}
