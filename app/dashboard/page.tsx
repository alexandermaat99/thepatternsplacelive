import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';
import { StripeContinueButton } from '@/components/marketplace/stripe-continue-button';
import { UserProfile } from '@/components/user-profile';
import { SignOutButton } from '@/components/sign-out-button';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Package,
  Heart,
  DollarSign,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowUpCircle,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import { StripeDashboardButton } from '@/components/stripe-dashboard-button';
import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';
import { createClient } from '@/lib/supabase/server';

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
  const hasSellerIntent = !!profile?.stripe_account_id; // User has started seller onboarding

  // Fetch earnings data if user can sell
  let earningsData = {
    thisMonthNet: 0,
    totalSales: 0,
    thisMonthSales: 0,
    topProduct: null as { title: string; sales: number } | null,
  };

  if (canSell) {
    const supabase = await createClient();
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
              ? 'Manage your marketplace account and Stripe integration'
              : 'Manage your account, purchases, and favorites'}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className={`grid grid-cols-1 ${hasSellerIntent ? 'md:grid-cols-2' : ''} gap-6`}>
        {/* Stripe Connect Status - Only show if user has started seller onboarding */}
        {hasSellerIntent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Stripe Connect
              {stripeStatus.isOnboarded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : stripeStatus.status === 'pending_verification' ? (
                <Clock className="h-5 w-5 text-yellow-500" />
              ) : stripeStatus.status === 'requires_info' || stripeStatus.detailsSubmitted ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {stripeStatus.isOnboarded ? (
                <Badge variant="default">Connected</Badge>
              ) : stripeStatus.status === 'pending_verification' ? (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                >
                  Pending Verification
                </Badge>
              ) : stripeStatus.status === 'requires_info' ? (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                >
                  More Info Required
                </Badge>
              ) : stripeStatus.detailsSubmitted ? (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                >
                  Setup Incomplete
                </Badge>
              ) : (
                <Badge variant="destructive">Not Connected</Badge>
              )}
            </div>

            {stripeStatus.accountId && (
              <div className="text-xs text-muted-foreground font-mono">
                ID: {stripeStatus.accountId}
              </div>
            )}

            {stripeStatus.isOnboarded ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is connected and ready to receive payments.
                </p>

                {/* Migration banner for Standard accounts */}
                {stripeStatus.accountType === 'standard' && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <ArrowUpCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Upgrade Available</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      You&apos;re using a Standard Stripe account. Upgrade to Express for faster
                      payouts and a better dashboard experience.
                    </p>
                    <StripeConnectButton
                      userId={user.id}
                      forceMigrate={true}
                      variant="outline"
                      label="Upgrade to Express"
                    />
                  </div>
                )}

                <Link href="/marketplace/sell">
                  <Button className="mt-4 w-full">List a Product</Button>
                </Link>
              </div>
            ) : stripeStatus.status === 'pending_verification' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Stripe is verifying your information. This usually takes just a few minutes.
                  You&apos;ll be able to start selling once verification is complete.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Additional verification may be required
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    For security compliance, Stripe may request your full SSN or a photo ID. This is
                    standard for all payment platforms. Click below to check if anything is needed.
                  </p>
                </div>
                <StripeContinueButton accountId={stripeStatus.accountId!} />
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </Link>
              </div>
            ) : stripeStatus.status === 'requires_info' || stripeStatus.detailsSubmitted ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Almost there! Stripe needs additional verification to complete your account:
                </p>
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Why is this required?
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Financial regulations require Stripe to verify your identity. This may include
                    your full SSN (not just last 4 digits) and/or a photo of your government-issued
                    ID. This is a one-time process and only takes a few minutes.
                  </p>
                </div>
                <StripeContinueButton accountId={stripeStatus.accountId!} />
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to start selling products and receiving payments.
                </p>
                <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                  <strong>Quick setup:</strong> You&apos;ll need your email, phone number, SSN (or
                  EIN for businesses), and bank account details. Most sellers complete setup in
                  under 5 minutes.
                </div>
                <StripeConnectButton userId={user.id} />
              </div>
            )}
          </CardContent>
        </Card>
        )}

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
                  Interested in selling? Connect your Stripe account to start listing products.
                </p>
                <StripeConnectButton userId={user.id} />
              </div>
            )}

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
          </CardContent>
        </Card>
      </div>

      {/* Mini Earnings Section - Only shown for sellers */}
      {canSell && (
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
