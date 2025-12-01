import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StripeConnectButton } from '@/components/marketplace/stripe-connect-button';
import { StripeContinueButton } from '@/components/marketplace/stripe-continue-button';
import { UserProfile } from '@/components/user-profile';
import { SignOutButton } from '@/components/sign-out-button';
import Link from 'next/link';
import { CheckCircle, XCircle, ExternalLink, Package, Heart, DollarSign, Clock, AlertCircle, RefreshCw, ArrowUpCircle } from 'lucide-react';
import { StripeDashboardButton } from '@/components/stripe-dashboard-button';
import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';

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
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Pending Verification
                </Badge>
              ) : stripeStatus.status === 'requires_info' ? (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  More Info Required
                </Badge>
              ) : stripeStatus.detailsSubmitted ? (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
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
                      You&apos;re using a Standard Stripe account. Upgrade to Express for faster payouts 
                      and a better dashboard experience.
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
                  <Button className="w-full">List a Product</Button>
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
                    For security compliance, Stripe may request your full SSN or a photo ID. 
                    This is standard for all payment platforms. Click below to check if anything is needed.
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
                    Financial regulations require Stripe to verify your identity. This may include your full SSN 
                    (not just last 4 digits) and/or a photo of your government-issued ID. This is a one-time 
                    process and only takes a few minutes.
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
                  <strong>Quick setup:</strong> You&apos;ll need your email, phone number, SSN (or EIN for businesses), 
                  and bank account details. Most sellers complete setup in under 5 minutes.
                </div>
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
                <Link href="/marketplace/sell" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    List New Product
                  </Button>
                </Link>
                <StripeDashboardButton />
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
        <UserProfile serverUser={user} serverProfile={profile} serverStripeStatus={stripeStatus} />
      </div>
    </div>
  );
}
