'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

function SignUpSuccessContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    // Conversion tracking - Add your tracking code here
    // Examples:
    
    // Google Ads conversion tracking
    // gtag('event', 'conversion', {
    //   'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
    //   'value': 1.0,
    //   'currency': 'USD'
    // });
    
    // Facebook Pixel
    // fbq('track', 'CompleteRegistration');
    
    // Custom analytics
    // analytics.track('sign_up_completed');
  }, []);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
              <div className="flex flex-col gap-2">
                {redirectUrl && (
                  <Button asChild className="w-full">
                    <Link href={`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`}>
                      Continue to Sign In
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">
                    Back to Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Loading...</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  );
}
