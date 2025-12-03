# Platform Take on $10 Sale (Including Stripe Fees)

## Transaction Details
- **Product Price**: $10.00
- **Tax Rate**: 8% (example - actual rate varies)
- **Tax Amount**: $10.00 × 8% = **$0.80**
- **Total Customer Pays**: $10.00 + $0.80 = **$10.80**

## Platform Fee Calculation
- **Platform Fee Percentage**: 5.6% (from COMPANY_INFO.fees.platformFeePercent)
- **Platform Fee on $10**: $10.00 × 5.6% = **$0.56**
- **Minimum Fee**: $0.50
- **Actual Platform Fee**: max($0.56, $0.50) = **$0.56** (percentage applies)

## Stripe Processing Fees
- **Stripe Fee**: 2.9% + $0.30 per transaction
- **Stripe Fee on $10.80 total**: ($10.80 × 2.9%) + $0.30 = $0.3132 + $0.30 = **$0.61** (approximately)
- **Who Pays Stripe Fees**: Platform absorbs (passStripeFeesToSeller: false)

## Money Flow Breakdown

### What Customer Pays
- **Total**: $10.80 (includes product + tax)

### What Seller Receives
- **Transfer Amount**: $10.00 - $0.56 = **$9.44**
- This is: Sale Price - Platform Fee (tax excluded)

### What Platform Receives (Gross)
- **Total Collected**: $10.80
- **Transferred to Seller**: $9.44
- **Platform Keeps (Gross)**: $10.80 - $9.44 = **$1.36**
  - Includes: $0.56 (platform fee) + $0.80 (tax for remittance)

### What Platform Pays (Stripe Fees)
- **Stripe Processing Fee**: ~$0.61 (on $10.80 total transaction)

### What Platform Keeps (Net)
- **Platform Gross**: $1.36
- **Stripe Fees Paid**: ~$0.61
- **Platform Net**: $1.36 - $0.61 = **$0.75**
  - This is: Platform Fee ($0.56) + Tax ($0.80) - Stripe Fees ($0.61)

## Summary Table

| Item | Amount |
|------|--------|
| **Customer Pays** | **$10.80** |
| | |
| Seller Receives | $9.44 |
| | |
| Platform Gross | $1.36 |
| - Platform Fee | $0.56 |
| - Tax (withheld) | $0.80 |
| | |
| Stripe Fees (paid by platform) | -$0.61 |
| | |
| **Platform Net** | **$0.75** |

## Key Points

1. **Platform Fee**: $0.56 (5.6% of sale price)
2. **Tax Withheld**: $0.80 (for remittance to tax authorities)
3. **Stripe Fees**: ~$0.61 (paid by platform, not seller)
4. **Platform Net**: $0.75 (after paying Stripe fees)

## Important Notes

- ✅ Platform absorbs Stripe fees (seller-friendly approach)
- ✅ Platform fee is calculated on sale price ($10), not total with tax
- ✅ Tax is withheld by platform for remittance
- ✅ Platform's actual net revenue is: Platform Fee - Stripe Fees = $0.56 - $0.61 = **-$0.05** (on this transaction, platform actually loses money after Stripe fees, but keeps the tax for remittance)

**Note**: On smaller transactions, Stripe fees can exceed the platform fee. The platform still keeps the tax amount for remittance, but the net platform revenue (fee - Stripe fees) may be negative on small transactions.

