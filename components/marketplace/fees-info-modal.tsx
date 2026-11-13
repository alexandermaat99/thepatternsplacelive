'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COMPANY_INFO } from '@/lib/company-info';
import { FeeBreakdown } from '@/components/marketplace/fee-breakdown';
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
              Lower than Etsy: no listing fees and no ad fees.
            </p>
            <p className="text-sm">Here's how fees are calculated per sale:</p>
            <div className="p-4 rounded border-2 border-rose-200 dark:border-white">
              <FeeBreakdown />
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
