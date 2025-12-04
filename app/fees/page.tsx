import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/dashboard/my-products">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Seller Fee Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fee Breakdown */}
          <div className="bg-muted p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Fee Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Our fee structure is the same as most popular platforms.
            </p>
            <p className="text-sm mb-4">Here's how fees are calculated per sale:</p>
            <div className="p-4 bg-white dark:bg-gray-900 rounded border-2 border-rose-200 dark:border-rose-800">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{COMPANY_INFO.name} Fees</p>
                  <p className="text-sm font-medium mb-1">
                    Listing Fee: ${(COMPANY_INFO.fees.listingFeeCents / 100).toFixed(2)} per sale
                  </p>
                  <p className="text-sm font-medium mb-2">
                    Transaction Fee: {(COMPANY_INFO.fees.transactionFeePercent * 100).toFixed(1)}%
                    of sale price
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Charged each time an item sells. Applied to the sale price. Goes to{' '}
                    {COMPANY_INFO.name} to help keep things running.
                  </p>
                </div>

                <div className="pt-2 border-t border-muted">
                  <p className="text-xs text-muted-foreground mb-1">Payment Processing Fee</p>
                  <p className="text-sm font-medium">
                    {(COMPANY_INFO.fees.paymentProcessingPercent * 100).toFixed(1)}% + $
                    {(COMPANY_INFO.fees.paymentProcessingFlatCents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Goes to Stripe for payment processing.
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-muted mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Example: $10.00 sale</p>
                  <div className="text-sm space-y-1">
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
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Total Fees:</span>
                      <span>${(calculateEtsyFees(1000).totalFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600 pt-1">
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
              For more information about Stripe's processing fees, visit{' '}
              <a
                href="https://stripe.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe's pricing page
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
        </CardContent>
      </Card>
    </div>
  );
}
