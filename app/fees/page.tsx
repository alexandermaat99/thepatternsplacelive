import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_INFO } from '@/lib/company-info';
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
            <h2 className="text-lg font-semibold mb-3">Platform Fee Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You pay a platform fee of <strong>{(COMPANY_INFO.fees.platformFeePercent * 100).toFixed(1)}%</strong> (minimum ${(COMPANY_INFO.fees.minimumFeeCents / 100).toFixed(2)}) per transaction. Here's how that fee is allocated:
            </p>
            
            <div className="p-4 bg-white dark:bg-gray-900 rounded border-2 border-rose-200 dark:border-rose-800">
              <p className="text-sm font-semibold mb-3">Platform Fee: {(COMPANY_INFO.fees.platformFeePercent * 100).toFixed(1)}% (min ${(COMPANY_INFO.fees.minimumFeeCents / 100).toFixed(2)})</p>
              
              <div className="ml-4 space-y-2 border-l-2 border-muted pl-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Goes to Stripe (Processing Fees){' '}
                    <a 
                      href="https://stripe.com/pricing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      (learn more)
                    </a>
                  </p>
                  <p className="text-sm font-medium">
                    2.9% + $0.30 per transaction
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stripe charges this to the platform account for processing credit card payments
                  </p>
                </div>
                
                <div className="pt-2 border-t border-muted">
                  <p className="text-xs text-muted-foreground mb-1">Goes to {COMPANY_INFO.name}</p>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    2.7%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The remainder after Stripe's fees are paid
                  </p>
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
              <a href={`mailto:${COMPANY_INFO.email.support}`} className="text-primary hover:underline">
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

