import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Link problem',
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Most errors here come from email links that expired or were already used
  // (e.g. clicking "Confirm my email" twice).
  const isLinkProblem = !error || /expired|invalid|already|used|otp|token|link/i.test(error);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isLinkProblem ? 'This link has expired' : 'Something went wrong'}
            </CardTitle>
            <CardDescription>
              {isLinkProblem
                ? 'Email links only work once and expire after a while. If you already confirmed your email, you can just log in.'
                : "We couldn't complete that request. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/forgot-password">Reset your password</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Back to home</Link>
            </Button>
            {error && (
              <p className="pt-2 text-xs text-muted-foreground">Details: {error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
