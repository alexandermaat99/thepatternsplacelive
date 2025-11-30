import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/back-button';
import {
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { COMPANY_INFO } from '@/lib/company-info';

// Format currency
function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Format date
function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

// Get percentage change
function getPercentageChange(
  current: number,
  previous: number
): { value: number; isPositive: boolean } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
}

export default async function EarningsPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch all completed orders for this seller
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
      id,
      amount,
      currency,
      platform_fee,
      stripe_fee,
      net_amount,
      status,
      created_at,
      product_id,
      products (
        id,
        title,
        image_url
      )
    `
    )
    .eq('seller_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
  }

  // Normalize orders - Supabase returns products as object but TS sees array
  const completedOrders = (orders || []).map(order => ({
    ...order,
    products: Array.isArray(order.products) ? order.products[0] : order.products,
  }));

  // Calculate stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // This month's orders
  const thisMonthOrders = completedOrders.filter(
    order => new Date(order.created_at) >= startOfMonth
  );

  // Last month's orders
  const lastMonthOrders = completedOrders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
  });

  // Calculate totals
  const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const totalPlatformFees = completedOrders.reduce(
    (sum, order) => sum + (order.platform_fee || 0),
    0
  );
  const totalStripeFees = completedOrders.reduce((sum, order) => sum + (order.stripe_fee || 0), 0);
  const totalNetEarnings = completedOrders.reduce(
    (sum, order) => sum + (order.net_amount || order.amount || 0),
    0
  );

  // This month totals
  const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const thisMonthNet = thisMonthOrders.reduce(
    (sum, order) => sum + (order.net_amount || order.amount || 0),
    0
  );

  // Last month totals
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const lastMonthNet = lastMonthOrders.reduce(
    (sum, order) => sum + (order.net_amount || order.amount || 0),
    0
  );

  // Calculate changes
  const revenueChange = getPercentageChange(thisMonthRevenue, lastMonthRevenue);
  const salesChange = getPercentageChange(thisMonthOrders.length, lastMonthOrders.length);

  // Group orders by product for top sellers
  const productSales = completedOrders.reduce(
    (acc, order) => {
      const productId = order.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product: order.products,
          count: 0,
          revenue: 0,
          netEarnings: 0,
        };
      }
      acc[productId].count += 1;
      acc[productId].revenue += order.amount || 0;
      acc[productId].netEarnings += order.net_amount || order.amount || 0;
      return acc;
    },
    {} as Record<string, { product: any; count: number; revenue: number; netEarnings: number }>
  );

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent orders (last 10)
  const recentOrders = completedOrders.slice(0, 10);

  // Fee info - use toFixed to avoid floating point precision issues
  const feePercent = Number((COMPANY_INFO.fees.platformFeePercent * 100).toFixed(2));
  const stripePercent = Number((COMPANY_INFO.fees.stripePercentFee * 100).toFixed(2));
  const stripeFlatFee = Number((COMPANY_INFO.fees.stripeFlatFeeCents / 100).toFixed(2));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton />

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          Seller Earnings
        </h1>
        <p className="text-muted-foreground">
          Track your sales, revenue, and earnings from your pattern sales
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Net Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalNetEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">After all fees</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Gross sales amount</p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>

        {/* Total Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalPlatformFees + totalStripeFees)}
            </div>
            <p className="text-xs text-muted-foreground">Platform + payment processing</p>
          </CardContent>
        </Card>
      </div>

      {/* This Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Month Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonthRevenue)}</div>
            <div className="flex items-center text-xs mt-1">
              {revenueChange.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={revenueChange.isPositive ? 'text-green-500' : 'text-red-500'}>
                {revenueChange.value.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthOrders.length}</div>
            <div className="flex items-center text-xs mt-1">
              {salesChange.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={salesChange.isPositive ? 'text-green-500' : 'text-red-500'}>
                {salesChange.value.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(thisMonthNet)}</div>
            <p className="text-xs text-muted-foreground">Your earnings after fees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((item, index) => (
                  <div key={item.product?.id || index} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    {item.product?.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product?.title || 'Product'}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.product?.title || 'Unknown Product'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.count} sale{item.count !== 1 ? 's' : ''} ·{' '}
                        {formatCurrency(item.netEarnings)} earned
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No sales yet. Your top products will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fee Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">Platform Fee</p>
                  <p className="text-sm text-muted-foreground">
                    {COMPANY_INFO.name} transaction fee
                  </p>
                </div>
                <Badge variant="secondary">{feePercent}%</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">Payment Processing</p>
                  <p className="text-sm text-muted-foreground">Stripe processing fee</p>
                </div>
                <Badge variant="secondary">
                  {stripePercent}% + ${stripeFlatFee.toFixed(2)}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">Your Fees Paid</p>
                  <p className="text-sm text-muted-foreground">Total deducted from sales</p>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {formatCurrency(totalPlatformFees + totalStripeFees)}
                </span>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Your Net Earnings
                  </p>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(totalNetEarnings)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Fees</th>
                    <th className="pb-3 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {order.products?.image_url && (
                            <img
                              src={order.products.image_url}
                              alt={order.products?.title || 'Product'}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <span className="font-medium truncate max-w-[200px]">
                            {order.products?.title || 'Unknown Product'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(order.amount, order.currency)}
                      </td>
                      <td className="py-3 text-right text-orange-600">
                        -
                        {formatCurrency(
                          (order.platform_fee || 0) + (order.stripe_fee || 0),
                          order.currency
                        )}
                      </td>
                      <td className="py-3 text-right font-medium text-green-600">
                        {formatCurrency(order.net_amount || order.amount, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No sales yet</h3>
              <p className="text-muted-foreground">
                When customers purchase your products, they'll appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
