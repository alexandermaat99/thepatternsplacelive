'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';
import { Button } from '@/components/ui/button';

interface FeesInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeesInfoModal({ isOpen, onClose }: FeesInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Seller Fee Breakdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Breakdown */}
          <div className="bg-muted p-4 rounded-lg ">
            <h2 className="text-lg font-semibold ">Fee Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Our fee structure is similar to most popular platforms.
            </p>
            <p className="text-sm">Here's how fees are calculated per sale:</p>
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
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
