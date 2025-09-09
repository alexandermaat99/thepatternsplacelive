'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, ExternalLink, User, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function UserProfile() {
  const router = useRouter();
  const { 
    user, 
    profile, 
    stripeStatus, 
    loading, 
    error, 
    refreshStripeStatus,
    isAuthenticated,
    canSell,
    signOut 
  } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please log in to view your profile.
          </p>
          <Link href="/auth/login">
            <Button>Log In</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Name:</span>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name || 'Not set'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Email:</span>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">User ID:</span>
              <p className="text-sm text-muted-foreground font-mono">
                {user?.id}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Member Since:</span>
              <p className="text-sm text-muted-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Connection
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
              {stripeStatus.isOnboarded ? "Connected & Ready" : "Not Connected"}
            </Badge>
          </div>
          
          {profile?.stripe_account_id && (
            <div>
              <span className="text-sm font-medium">Stripe Account ID:</span>
              <p className="text-sm text-muted-foreground font-mono">
                {profile.stripe_account_id}
              </p>
            </div>
          )}

          <div>
            <span className="text-sm font-medium">Can Sell Products:</span>
            <p className="text-sm text-muted-foreground">
              {canSell ? 'Yes' : 'No - Complete Stripe setup first'}
            </p>
          </div>

          {profile?.stripe_account_id && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshStripeStatus}
              >
                Refresh Status
              </Button>
              {!canSell && (
                <Link href="/marketplace/sell">
                  <Button size="sm">
                    Complete Setup
                  </Button>
                </Link>
              )}
            </div>
          )}

          {!profile?.stripe_account_id && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Connect your Stripe account to start selling products.
              </p>
              <Link href="/marketplace/sell">
                <Button size="sm">
                  Connect Stripe
                </Button>
              </Link>
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
          
          {canSell && (
            <Link href="/marketplace/sell" className="block">
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                List New Product
              </Button>
            </Link>
          )}
          
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
