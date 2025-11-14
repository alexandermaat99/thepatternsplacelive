import { redirect } from 'next/navigation';
import { getCurrentUserWithProfileServer, getStripeAccountStatusServer } from '@/lib/auth-helpers-server';
import { SellForm } from '@/components/marketplace/sell-form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function SellPage() {
  // Fetch user and profile on the server (faster)
  const authData = await getCurrentUserWithProfileServer();
  
  if (!authData || !authData.user) {
    redirect('/auth/login');
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

  return <SellForm user={user} profile={profile} stripeStatus={stripeStatus} canSell={canSell} />;
}
