import { getCurrentUserWithProfileServer, getStripeAccountStatusServer } from '@/lib/auth-helpers-server';
import { SellForm } from '@/components/marketplace/sell-form';

export default async function SellPage() {
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

  return <SellForm user={user} profile={profile} stripeStatus={stripeStatus} canSell={canSell} />;
}
