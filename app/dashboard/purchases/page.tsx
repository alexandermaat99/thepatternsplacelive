import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/back-button';
import { DateDisplay } from '@/components/date-display';
import { Package, ShoppingBag, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatAmountForDisplay } from '@/lib/utils-client';

export default async function PurchasesPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch all completed orders for this buyer (only authenticated purchases)
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
      id,
      amount,
      total_amount,
      currency,
      status,
      created_at,
      product_id,
      products (
        id,
        title,
        image_url,
        category,
        user_id,
        profiles:user_id (
          username,
          full_name
        )
      )
    `
    )
    .eq('buyer_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching purchases:', ordersError);
  }

  // Normalize orders - Supabase returns products as object but TS sees array
  const normalizedOrders = (orders || []).map(order => ({
    ...order,
    products: Array.isArray(order.products) ? order.products[0] : order.products,
  }));

  // Fetch reviews for all purchased products
  const productIds = normalizedOrders.map(order => order.product_id);
  let reviewsMap: Record<string, { rating: number }> = {};

  if (productIds.length > 0) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('product_id, rating')
      .eq('buyer_id', user.id)
      .in('product_id', productIds);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    } else if (reviews) {
      reviewsMap = reviews.reduce((acc, review) => {
        acc[review.product_id] = { rating: review.rating };
        return acc;
      }, {} as Record<string, { rating: number }>);
    }
  }

  // Combine orders with review information
  const purchases = normalizedOrders.map(order => ({
    ...order,
    review: reviewsMap[order.product_id] || null,
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton />

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-8 w-8" />
          My Purchases
        </h1>
        <p className="text-muted-foreground">View and manage your purchased patterns</p>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No purchases yet</h3>
            <p className="text-muted-foreground mb-4">
              When you purchase patterns while logged in, they&apos;ll appear here.
            </p>
            <Link href="/marketplace">
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Browse Marketplace
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map(purchase => {
            const product = purchase.products;
            const seller = Array.isArray(product?.profiles)
              ? product.profiles[0]
              : product?.profiles;

            return (
              <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Product Image - Clickable */}
                  <Link href={`/marketplace/product/${product?.id}`}>
                    <div className="relative w-full h-48 bg-muted cursor-pointer">
                      {product?.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product?.title || 'Product'}
                          fill
                          className="object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link href={`/marketplace/product/${product?.id}`}>
                      <div className="mb-2">
                        <h3 className="font-semibold text-lg line-clamp-2 mb-1 hover:text-primary transition-colors">
                          {product?.title || 'Unknown Product'}
                        </h3>
                        {product?.category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </Link>

                    {seller && (
                      <p className="text-sm text-muted-foreground mb-2">
                        by{' '}
                        <Link
                          href={`/marketplace/seller/${seller.username || seller.full_name}`}
                          className="text-primary hover:underline"
                        >
                          {seller.full_name || seller.username || 'Unknown Seller'}
                        </Link>
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>Purchased:</span>
                      <DateDisplay date={purchase.created_at} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">
                        {formatAmountForDisplay(purchase.amount || 0, purchase.currency)}
                      </span>
                      <Badge variant="default" className="bg-green-600">
                        Completed
                      </Badge>
                    </div>

                    {/* Review Button */}
                    <div className="mt-4 pt-4 border-t">
                      <Link
                        href={`/marketplace/product/${product?.id}#reviews`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        {purchase.review ? (
                          <>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i <= purchase.review!.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>Edit Your Review</span>
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4" />
                            <span>Leave a Review</span>
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
