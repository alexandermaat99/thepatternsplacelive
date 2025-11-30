import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';
import { UserProfile } from '@/components/user-profile';
import { SignOutButton } from '@/components/sign-out-button';
import Link from 'next/link';
import { CheckCircle, XCircle, ExternalLink, Package, Heart } from 'lucide-react';
import { getCurrentUserWithProfileServer, getStripeAccountStatusServer } from '@/lib/auth-helpers-server';

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
  const stripeStatusTimeout = new Promise(resolve => 
    setTimeout(() => resolve({
      isConnected: !!profile?.stripe_account_id,
      isOnboarded: false,
      accountId: profile?.stripe_account_id || null,
      status: 'unknown' as const
    }), 2000) // 2 second timeout
  );

  const stripeStatus = await Promise.race([
    stripeStatusPromise,
    stripeStatusTimeout
  ]) as any;

  const canSell = stripeStatus.isOnboarded;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your marketplace account and Stripe integration
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Connect Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Stripe Connect
                {stripeStatus.isOnboarded ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={stripeStatus.isOnboarded ? "default" : "destructive"}>
                  {stripeStatus.isOnboarded ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              
              {stripeStatus.isOnboarded ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your Stripe account is connected and ready to receive payments.
                  </p>
                  <Link href="/marketplace/sell">
                    <Button className="w-full">
                      List a Product
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Connect your Stripe account to start selling products and receiving payments.
                  </p>
                  <StripeConnectButton userId={user.id} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/marketplace" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
              
              <Link href="/dashboard/favorites" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Heart className="h-4 w-4 mr-2" />
                  View My Favorites
                </Button>
              </Link>
              
              {canSell && (
                <>
                  <Link href="/dashboard/my-products" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      View My Products
                    </Button>
                  </Link>
                  <Link href="/marketplace/sell" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      List New Product
                    </Button>
                  </Link>
                </>
              )}
              
              <Link href="/" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* User Profile Component */}
        <div className="mt-6">
          <UserProfile 
            serverUser={user}
            serverProfile={profile}
            serverStripeStatus={stripeStatus}
          />
        </div>
    </div>
  );
}
