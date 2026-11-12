import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { COMPANY_INFO } from '@/lib/company-info';

const SIGN_UP_URL = '/auth/sign-up?redirect=/marketplace/sell';
const LOG_IN_URL = '/auth/login?redirect=/marketplace/sell';

const STEPS = [
  {
    title: 'Create a free account',
    body: 'Sign up in under a minute. There is no cost to open a shop or list a pattern.',
  },
  {
    title: 'Upload your pattern',
    body: 'Add your PDF files, photos, a description, and a price, or list it for free. Buyers get your files by email as soon as they purchase.',
  },
  {
    title: 'Get paid',
    body: 'Set up payouts once through Stripe, our payments partner, and your earnings are sent straight to your bank account.',
  },
];

/** Public "sell with us" page shown at /marketplace/sell to logged-out visitors. */
export function SellLanding() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold">Sell your sewing patterns</h1>
        <p className="text-lg text-muted-foreground">
          {COMPANY_INFO.name} is a marketplace for independent creators selling digital sewing,
          knitting, crochet, and other crafting patterns. List your designs as instant downloads and
          keep doing what you love.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg">
            <Link href={SIGN_UP_URL}>Start selling</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={LOG_IN_URL}>Log in</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="pt-6 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step {i + 1}</p>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Fees</h2>
        <p className="text-muted-foreground">
          Listing is free. Platform fees are waived on your first 5 sales, so you only pay Stripe&apos;s
          payment processing fee. Free patterns don&apos;t need payout setup at all.{' '}
          <Link href="/fees" className="underline underline-offset-4">
            See the full fee breakdown
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What you can sell</h2>
        <p className="text-muted-foreground">
          Human-made digital patterns that you have the right to sell: your own designs, or public
          domain and openly licensed patterns with the original designer credited. AI-generated
          patterns and services, such as commissions or sewing for hire, aren&apos;t allowed. Read
          our{' '}
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/marketplace/watermarking-info" className="underline underline-offset-4">
            how file delivery and watermarking work
          </Link>
          .
        </p>
      </section>

      <section className="text-center">
        <Button asChild size="lg">
          <Link href={SIGN_UP_URL}>Create your free account</Link>
        </Button>
      </section>
    </div>
  );
}
