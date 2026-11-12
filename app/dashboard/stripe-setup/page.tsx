import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { StripeEmbeddedOnboarding } from '@/components/marketplace/stripe-embedded-onboarding';
import {
  getCurrentUserWithProfileServer,
  getStripeAccountStatusServer,
} from '@/lib/auth-helpers-server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_INFO } from '@/lib/company-info';

export default async function StripeSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authData = await getCurrentUserWithProfileServer();
  if (!authData?.user) {
    redirect('/auth/login');
  }

  const { profile } = authData;
  const { error } = await searchParams;
  const status = await getStripeAccountStatusServer(profile?.stripe_account_id ?? null);

  const backLink = (
    <div className="mb-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );

  if (status.isOnboarded && !status.requiresMoreInfo) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {backLink}
        <Card className="text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">You&apos;re ready to get paid</h1>
            <p className="text-muted-foreground">
              Payouts are set up. Earnings from your sales will be sent to your bank account
              automatically.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button asChild>
                <Link href="/marketplace/sell">List a product</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.status === 'pending_verification') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {backLink}
        <Card className="text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Thanks, your details are being reviewed</h1>
            <p className="text-muted-foreground">
              Stripe is verifying your information. This usually takes a few minutes, though it can
              occasionally take a day or two. If anything else is needed, you&apos;ll see it on your
              dashboard and Stripe will email you.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/marketplace/sell">List a free pattern</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUpdate = status.isOnboarded || status.status === 'requires_info';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {backLink}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isUpdate ? 'Update your payout details' : 'Set up payouts'}
          </CardTitle>
          <CardDescription>
            {isUpdate
              ? 'Stripe needs a little more information to keep your account verified.'
              : `${COMPANY_INFO.name} partners with Stripe to process payments and send your earnings to your bank. You'll need a few personal details and your bank account. Most sellers finish in about 5 minutes.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              We couldn&apos;t open Stripe just now. Please try again in a moment.
            </p>
          )}
          <StripeEmbeddedOnboarding />
        </CardContent>
      </Card>
    </div>
  );
}
