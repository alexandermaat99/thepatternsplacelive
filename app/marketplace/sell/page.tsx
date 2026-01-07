import { getCurrentUserWithProfileServer, getStripeAccountStatusServer } from '@/lib/auth-helpers-server';
import { SellForm } from '@/components/marketplace/sell-form';
import { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

export const metadata: Metadata = {
  title: `Sell Your Patterns - ${COMPANY_INFO.name}`,
  description: 'List your sewing and crafting patterns on our marketplace. Reach thousands of crafters and start selling today.',
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/marketplace/sell`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
