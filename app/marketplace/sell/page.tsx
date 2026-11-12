import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';
import { SellForm } from '@/components/marketplace/sell-form';
import { SellLanding } from '@/components/marketplace/sell-landing';
import { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

export const metadata: Metadata = {
  title: 'Sell Your Sewing Patterns',
  description:
    'Sell your original sewing, knitting, and crochet patterns as digital downloads. Free to list, no platform fees on your first 5 sales, and payouts straight to your bank.',
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/marketplace/sell`,
  },
  robots: {
    // Allow indexing so the sell page can appear in search results.
    // The actual selling flow still requires authentication.
    index: true,
    follow: true,
  },
};

export default async function SellPage() {
  const authData = await getCurrentUserWithProfileServer();

  // Logged-out visitors (and search engines) get the "sell with us" landing page.
  if (!authData || !authData.user) {
    return <SellLanding />;
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

  return <SellForm user={user} profile={profile} stripeStatus={stripeStatus} canSell={canSell} />;
}
