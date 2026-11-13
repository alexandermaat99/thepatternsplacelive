import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_INFO } from '@/lib/company-info';
import { FeeBreakdown } from '@/components/marketplace/fee-breakdown';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Seller Fees',
  description:
    "Learn about our transparent fee structure for sellers. See how fees are calculated and what you'll receive from each sale.",
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/fees`,
  },
  openGraph: {
    title: `Seller Fees | ${COMPANY_INFO.name}`,
    description:
      "Learn about our transparent fee structure for sellers. See how fees are calculated and what you'll receive from each sale.",
    url: `${COMPANY_INFO.urls.website}/fees`,
    type: 'website',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function FeesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/marketplace/sell">
          <Button variant="ghost" className="flex items-center gap-2">
            ← Back to Selling
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Seller Fee Breakdown</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fee Breakdown */}
          <div className="bg-muted p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Fee Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lower than Etsy: no listing fees and no ad fees.
            </p>
            <p className="text-sm mb-4">Here&apos;s how fees are calculated per sale:</p>
            <div className="p-4 rounded border-2 border-rose-200 dark:border-white">
              <FeeBreakdown />
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-2">Questions?</h2>
            <p className="text-sm text-muted-foreground mb-2">
              For more information about Stripe&apos;s processing fees, visit{' '}
              <a
                href="https://stripe.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe&apos;s pricing page
              </a>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              If you have questions about fees or pricing, please contact{' '}
              <a
                href={`mailto:${COMPANY_INFO.email.support}`}
                className="text-primary hover:underline"
              >
                {COMPANY_INFO.email.support}
              </a>
              .
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Link href="/marketplace/sell">
              <Button>Start Selling</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline">Browse Marketplace</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
