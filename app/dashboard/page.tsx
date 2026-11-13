import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';
import { PayoutsCard } from '@/components/marketplace/payouts-card';
import { UserProfile } from '@/components/user-profile';
import { SignOutButton } from '@/components/sign-out-button';
import Link from 'next/link';
import {
  Package,
  Heart,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Gift,
} from 'lucide-react';
import { StripeDashboardButton } from '@/components/stripe-dashboard-button';
import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';

// Format currency helper
function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export default async function DashboardPage() {
  // Fetch user and profile on the server (faster)
  // Auth is handled by the layout, so user should exist
  const authData = await getCurrentUserWithProfileServer();

  // If no auth data (shouldn't happen due to layout protection), return null
  if (!authData || !authData.user) {
    return null;
  }

  const { user, profile } = authData;

  // Fetch Stripe status in parallel (non-blocking, with timeout)
  const stripeStatusPromise = getStripeAccountStatusServer(profile?.stripe_account_id || null);

  // Use Promise.race to add a timeout so Stripe check doesn't block the page
  const stripeStatusTimeout = new Promise(
    resolve =>
      setTimeout(
        () =>
          resolve({
            isConnected: !!profile?.stripe_account_id,
            isOnboarded: false,
            accountId: profile?.stripe_account_id || null,
            status: 'unknown' as const,
          }),
        2000
      ) // 2 second timeout
  );

  const stripeStatus = (await Promise.race([stripeStatusPromise, stripeStatusTimeout])) as any;

  const canSell = stripeStatus.isOnboarded;

  // Platform fee waiver status for the banner
  const freeSalesLeft = Math.max(
    0,
    COMPANY_INFO.fees.freeSalesCount - (profile?.completed_sales_count ?? 0)
  );
  const waivedUntil = profile?.platform_fee_waived_until
    ? new Date(profile.platform_fee_waived_until)
    : null;
  const activeWaiverUntil = waivedUntil && waivedUntil > new Date() ? waivedUntil : null;
  const processingFeeText = `${COMPANY_INFO.fees.paymentProcessingPercent * 100}% + $${(
    COMPANY_INFO.fees.paymentProcessingFlatCents / 100
  ).toFixed(2)}`;
  const hasSellerIntent = !!profile?.stripe_account_id; // User has started seller onboarding

  // Fetch product count so we can show "My Products" to free-only sellers who have listed items
  const supabase = await createClient();
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const hasListedProducts = (productCount ?? 0) >= 1;

  // Fetch earnings data if user can sell
  let earningsData = {
    thisMonthNet: 0,
    totalSales: 0,
    thisMonthSales: 0,
    topProduct: null as { title: string; sales: number } | null,
  };

  if (canSell) {
    const { data: orders } = await supabase
      .from('orders')
      .select('amount, net_amount, created_at, product_id, products(title)')
      .eq('seller_id', user.id)
      .eq('status', 'completed');

    if (orders && orders.length > 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      earningsData.totalSales = orders.length;

      const thisMonthOrders = orders.filter(order => new Date(order.created_at) >= startOfMonth);
      earningsData.thisMonthSales = thisMonthOrders.length;
      earningsData.thisMonthNet = thisMonthOrders.reduce(
        (sum, order) => sum + (order.net_amount || order.amount || 0),
        0
      );

      // Find most popular product
      const productCounts: Record<string, { title: string; count: number }> = {};
      orders.forEach((order: any) => {
        const productId = order.product_id;
        const productTitle = order.products?.title || 'Unknown';
        if (!productCounts[productId]) {
          productCounts[productId] = { title: productTitle, count: 0 };
        }
        productCounts[productId].count++;
      });

      const topProductEntry = Object.values(productCounts).sort((a, b) => b.count - a.count)[0];
      if (topProductEntry) {
        earningsData.topProduct = { title: topProductEntry.title, sales: topProductEntry.count };
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {hasSellerIntent
              ? 'Manage your shop, payouts, and purchases'
              : 'Manage your account, purchases, and favorites'}
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Platform fee waiver banner: Founding Designer waiver or first free sales */}
      {hasSellerIntent && (activeWaiverUntil || freeSalesLeft > 0) && (
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  {activeWaiverUntil ? 'Founding Designer: no platform fees' : 'Platform Fee Waiver Active'}
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {activeWaiverUntil
                    ? `You pay no platform fees on sales until ${activeWaiverUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                    : `Your next ${freeSalesLeft} sale${freeSalesLeft !== 1 ? 's have' : ' has'} platform fees waived.`}{' '}
                  Only payment processing ({processingFeeText}) applies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid grid-cols-1 ${hasSellerIntent ? 'md:grid-cols-2' : ''} gap-6`}>
        {/* Payouts status - only once the user has started seller onboarding */}
        {hasSellerIntent && <PayoutsCard stripeStatus={stripeStatus} />}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/purchases" className="block">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingBag className="h-4 w-4 mr-2" />
                My Purchases
              </Button>
            </Link>

            <Link href="/dashboard/favorites" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Heart className="h-4 w-4 mr-2" />
                View My Favorites
              </Button>
            </Link>

            {/* Show "Start Selling" option for buyers who haven't started onboarding */}
            {!hasSellerIntent && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Interested in selling? Set up payouts to start listing paid patterns.
                </p>
                <StripeConnectButton label="Start selling" />
              </div>
            )}

            {/* List a free pattern without Stripe — always show when user can't sell paid yet */}
            {!canSell && (
              <div className="pt-3 border-t">
                <Link href="/marketplace/sell" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    List a free pattern (no Stripe needed)
                  </Button>
                </Link>
              </div>
            )}

            {/* Full seller actions: Earnings, My Products, Stripe — only when Stripe is approved */}
            {canSell && (
              <>
                <Link href="/dashboard/earnings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Earnings
                  </Button>
                </Link>
                <Link href="/dashboard/my-products" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    View My Products
                  </Button>
                </Link>

                <StripeDashboardButton />
              </>
            )}

            {/* Seller actions when they have listings but Stripe not approved yet: My Products + Earnings (zeros until they complete Stripe) */}
            {!canSell && hasListedProducts && (
              <div className="pt-3 border-t space-y-3">
                <Link href="/dashboard/earnings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Earnings
                  </Button>
                </Link>
                <Link href="/dashboard/my-products" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    View My Products
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mini Earnings Section - shown when Stripe approved or when they have listings (zeros until paid sales) */}
      {(canSell || hasListedProducts) && (
        <Link href="/dashboard/earnings" className="block mt-6">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Top Product</p>
                  <p className="text-xs font-bold truncate" title={earningsData.topProduct?.title}>
                    {earningsData.topProduct?.title || '—'}
                  </p>
                  {earningsData.topProduct && (
                    <p className="text-xs text-muted-foreground">
                      {earningsData.topProduct.sales} sales
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(earningsData.thisMonthNet)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold">{earningsData.totalSales}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold">{earningsData.thisMonthSales} sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* User Profile Component */}
      <div className="mt-6">
        <UserProfile serverUser={user} serverProfile={profile} serverStripeStatus={stripeStatus} />
      </div>
    </div>
  );
}
