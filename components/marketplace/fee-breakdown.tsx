import { COMPANY_INFO, calculateEtsyFees } from '@/lib/company-info';

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const pct = (fraction: number) => `${+(fraction * 100).toFixed(2)}%`;

/**
 * Seller fee breakdown with a $10 example. Reads the live rates from
 * COMPANY_INFO.fees, so it never drifts from what checkout charges.
 */
export function FeeBreakdown() {
  const { fees } = COMPANY_INFO;
  const exampleCents = 1000;
  const example = calculateEtsyFees(exampleCents);
  const exampleWaived = calculateEtsyFees(exampleCents, true);
  const platformFeeText =
    fees.listingFeeCents > 0
      ? `${pct(fees.transactionFeePercent)} of sale price + ${usd(fees.listingFeeCents)} per sale`
      : `${pct(fees.transactionFeePercent)} of sale price. No listing fees, no ad fees`;

  return (
    <div className="space-y-3">
      <div className="pt-2 border-t border-muted">
        <p className="text-xs text-muted-foreground mb-1">
          Platform Fee {'->'}{' '}
          <span className="text-xs font-bold text-rose-300 dark:text-rose-400">
            {COMPANY_INFO.name}
          </span>
        </p>
        <p className="text-sm font-medium text-foreground">{platformFeeText}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Waived on your first {fees.freeSalesCount} sales, and for Founding Designers.
        </p>
      </div>

      <div className="pt-2 border-t border-muted">
        <p className="text-xs text-muted-foreground mb-1">
          Payment Processing Fee {'->'}{' '}
          <span className="text-xs font-bold text-rose-300 dark:text-rose-400">Stripe</span>
        </p>
        <p className="text-sm font-medium text-foreground">
          {pct(fees.paymentProcessingPercent)} + {usd(fees.paymentProcessingFlatCents)}
        </p>
      </div>

      <div className="pt-3 border-t-2 border-muted mt-3">
        <p className="text-xs text-muted-foreground mb-1">Example: {usd(exampleCents)} sale</p>
        <div className="text-sm space-y-1 text-foreground">
          {example.listingFee > 0 && (
            <div className="flex justify-between">
              <span>Listing Fee:</span>
              <span>{usd(example.listingFee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Platform Fee ({pct(fees.transactionFeePercent)}):</span>
            <span>{usd(example.transactionFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              Payment Processing ({pct(fees.paymentProcessingPercent)} +{' '}
              {usd(fees.paymentProcessingFlatCents)}):
            </span>
            <span>{usd(example.paymentProcessing)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-muted">
            <span>Total Fees:</span>
            <span>{usd(example.totalFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-green-600 dark:text-green-400 pt-1">
            <span>You Receive:</span>
            <span>{usd(exampleCents - example.totalFee)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>You receive with platform fee waived:</span>
            <span>{usd(exampleCents - exampleWaived.totalFee)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
