'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COMPANY_INFO } from '@/lib/company-info';
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
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

