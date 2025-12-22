import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Seller Fees | The Patterns Place',
  description:
    "Learn about our transparent fee structure for sellers. See how fees are calculated and what you'll receive from each sale.",
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
          <CardTitle className="text-2xl">Seller Fee Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fee Breakdown */}
          <div className="bg-muted p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Fee Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Our fee structure is similar to most popular platforms.
            </p>
            <p className="text-sm mb-4">Here&apos;s how fees are calculated per sale:</p>
            <div className="p-4 rounded border-2 border-rose-200 dark:border-white">
              <div className="space-y-3">
                <div className="pt-2 border-t border-muted">
                  <p className="text-xs text-muted-foreground mb-1">
                    Transaction Fee & Listing Fee {'->'}{' '}
                    <span className="text-xs font-bold text-rose-300 dark:text-rose-400">
                      {COMPANY_INFO.name}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {(COMPANY_INFO.fees.transactionFeePercent * 100).toFixed(1)}% of sale price + $
                    {(COMPANY_INFO.fees.listingFeeCents / 100).toFixed(2)} per sale
                  </p>
                </div>

                <div className="pt-2 border-t border-muted">
                  <p className="text-xs text-muted-foreground mb-1">
                    Payment Processing Fee {'->'}{' '}
                    <span className="text-xs font-bold text-rose-300 dark:text-rose-400">
                      Stripe
                    </span>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {(COMPANY_INFO.fees.paymentProcessingPercent * 100).toFixed(1)}% + $
                    {(COMPANY_INFO.fees.paymentProcessingFlatCents / 100).toFixed(2)}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-muted mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Example: $10.00 sale</p>
                  <div className="text-sm space-y-1 text-foreground">
                    <div className="flex justify-between">
                      <span>Listing Fee:</span>
                      <span>${(COMPANY_INFO.fees.listingFeeCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Fee (6.5%):</span>
                      <span>${(10 * COMPANY_INFO.fees.transactionFeePercent).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Processing (3% + $0.25):</span>
                      <span>
                        $
                        {(
                          10 * COMPANY_INFO.fees.paymentProcessingPercent +
                          COMPANY_INFO.fees.paymentProcessingFlatCents / 100
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t border-muted">
                      <span>Total Fees:</span>
                      <span>${(calculateEtsyFees(1000).totalFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600 dark:text-green-400 pt-1">
                      <span>You Receive:</span>
                      <span>${(10 - calculateEtsyFees(1000).totalFee / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
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
