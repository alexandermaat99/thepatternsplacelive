# Price Breakdown: $10 Sale with 7.45% Tax

## Transaction Details

- **Product Price**: $10.00
- **Tax Rate**: 7.45%
- **Tax Amount**: $10.00 × 7.45% = $0.745 ≈ **$0.75** (rounded to 2 decimals)
- **Total Customer Pays**: $10.00 + $0.75 = **$10.75**

## Platform Fee Calculation

- **Platform Fee Percentage**: 5.6% (from COMPANY_INFO.fees.platformFeePercent)
- **Platform Fee on $10**: $10.00 × 5.6% = **$0.56**
- **Minimum Fee**: $0.50
- **Actual Platform Fee**: max($0.56, $0.50) = **$0.56** (percentage applies)

## Stripe Fees (Flat-Only Passthrough)

- **Stripe Percentage (2.9%)**: Platform absorbs = $10.75 × 2.9% = **$0.31** (platform pays)
- **Stripe Flat Fee**: Seller pays = **$0.30** (passed to seller)

## Money Flow Breakdown

### What Customer Pays

- **Total**: $10.75 (includes product + tax)

### What Seller Receives

- **Sale Price**: $10.00
- **Platform Fee**: -$0.56
- **Stripe Flat Fee**: -$0.30
- **Seller Receives**: $10.00 - $0.56 - $0.30 = **$9.14**

### What Platform Receives (Gross)

- **Total Collected**: $10.75
- **Transferred to Seller**: $9.14
- **Platform Keeps (Gross)**: $10.75 - $9.14 = **$1.61**
  - Includes: $0.56 (platform fee) + $0.75 (tax for remittance) + $0.30 (stripe flat that seller paid)

### What Platform Pays (Stripe Fees)

- **Stripe Percentage Fee**: $10.75 × 2.9% = **$0.31** (platform absorbs)

### What Platform Keeps (Net)

- **Platform Gross**: $1.61
- **Stripe Fees Paid**: -$0.31
- **Platform Net Revenue**: $0.56 - $0.31 = **$0.25**
- **Tax Withheld**: $0.75 (for remittance to tax authorities)
- **Total Platform Keeps**: **$1.00** ($0.25 net revenue + $0.75 tax)

## Summary Table

| Item                      | Amount     |
| ------------------------- | ---------- |
| **Customer Pays**         | **$10.75** |
|                           |            |
| Product Price             | $10.00     |
| Tax (7.45%)               | $0.75      |
|                           |            |
| **Seller Receives**       | **$9.14**  |
|                           |            |
| Sale Price                | $10.00     |
| - Platform Fee (5.6%)     | -$0.56     |
| - Stripe Flat Fee         | -$0.30     |
|                           |            |
| **Platform Keeps**        | **$1.61**  |
|                           |            |
| Platform Fee              | $0.56      |
| Tax (withheld)            | $0.75      |
| Stripe Flat (from seller) | $0.30      |
|                           |            |
| **Platform Costs**        | **-$0.31** |
|                           |            |
| Stripe Percentage (2.9%)  | -$0.31     |
|                           |            |
| **Platform Net**          | **$0.25**  |
|                           |            |
| Plus Tax (for remittance) | +$0.75     |
|                           |            |
| **Total Platform Holds**  | **$1.00**  |

## Key Points

- ✅ **Seller receives**: $9.14 (Sale Price - Platform Fee - Stripe Flat)
- ✅ **Platform net revenue**: $0.25 (Platform Fee - Stripe Percentage)
- ✅ **Platform holds tax**: $0.75 (for remittance to tax authorities)
- ✅ **Platform total keeps**: $1.61 gross, $1.00 net (after Stripe fees)

## Verification

- Customer pays: $10.75 ✓
- Seller receives: $9.14 ✓
- Platform keeps: $1.61 (gross) ✓
- Platform net: $0.25 (after Stripe percentage fee) ✓
- Tax for remittance: $0.75 ✓
- Check: $9.14 + $1.61 = $10.75 ✓
