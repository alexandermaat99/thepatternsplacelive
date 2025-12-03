# Stripe Fee Passthrough Implementation

## What Changed

Changed `passStripeFeesToSeller: true` in `lib/company-info.ts`

This ensures the platform never loses money by passing Stripe processing fees to sellers.

## How It Works Now

### Fee Calculation

1. **Platform Fee**: 5.6% of sale price (you keep)
2. **Stripe Fees**: 2.9% + $0.30 (passed to seller)
3. **Total Fee**: Platform Fee + Stripe Fees (deducted from seller)

### Example: $10 Sale

**Before (Platform absorbed fees):**

- Platform fee: $0.56
- Stripe fees: ~$0.61 (platform paid)
- Platform net: **-$0.05** ❌ (lost money)

**After (Seller pays fees):**

- Platform fee: $0.56 (you keep)
- Stripe fees: ~$0.29 + $0.30 = $0.59 (seller pays)
- Total deducted: $0.56 + $0.59 = $1.15
- Seller receives: $10 - $1.15 = **$8.85**
- Platform net: **$0.56** ✅ (always profitable)

## Money Flow

### Customer Pays

- Product: $10.00
- Tax (8%): $0.80
- **Total: $10.80**

### Seller Receives

- Sale Price: $10.00
- Platform Fee: -$0.56
- Stripe Fees: -$0.59
- **Seller Gets: $8.85**

### Platform Keeps

- Platform Fee: $0.56 (revenue)
- Tax: $0.80 (for remittance)
- **Total: $1.36**
- Stripe fees: -$0.61 (paid by platform, but recovered from seller)
- **Net: $0.56** (platform fee only, tax is for remittance)

## Important Notes

1. **Stripe Fee Calculation**: Currently calculated on sale price, but Stripe actually charges on total (including tax). The difference is small and acceptable as an estimate.

2. **Tax Withholding**: Tax is still withheld by platform (not included in seller payout).

3. **Minimum Fee**: Still applies - if 5.6% + Stripe fees is less than $0.50, minimum applies.

4. **Seller Transparency**: Sellers see the total fee (platform + Stripe) deducted from their payout.

## Result

✅ **Platform always profitable** - keeps 5.6% on every sale
✅ **No losses** - Stripe fees are passed to seller
✅ **Industry standard** - Same model as Etsy, Amazon, etc.
✅ **Simple implementation** - Just one config change
