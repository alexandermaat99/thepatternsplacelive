# Price Breakdown Example: $1.50 Product

## Transaction Details
- **Product Price**: $1.50
- **Tax Rate**: 8% (example - actual rate varies by location)
- **Tax Amount**: $1.50 × 8% = **$0.12**
- **Total Customer Pays**: $1.50 + $0.12 = **$1.62**

## Platform Fee Calculation
- **Platform Fee Percentage**: 5.6% (from COMPANY_INFO.fees.platformFeePercent)
- **Platform Fee on $1.50**: $1.50 × 5.6% = $0.084
- **Minimum Fee**: $0.50
- **Actual Platform Fee**: max($0.084, $0.50) = **$0.50** (minimum applies)

## Money Flow

### What Customer Pays
- **Total**: $1.62 (includes product + tax)

### What Seller Receives
- **Transfer Amount** (via `transfer_data.amount`): $1.50 - $0.50 = **$1.00**
- This is: Sale Price - Platform Fee (tax excluded)

### What Platform Keeps
- **Total Collected**: $1.62
- **Transferred to Seller**: $1.00
- **Platform Keeps**: $1.62 - $1.00 = **$0.62**
  - Includes: $0.50 (platform fee) + $0.12 (tax for remittance)

## Verification
- Platform fee: $0.50 ✓ (minimum applies)
- Tax withheld: $0.12 ✓
- Total platform keeps: $0.50 + $0.12 = $0.62 ✓
- Seller receives: $1.00 (Sale Price - Platform Fee) ✓
- Customer pays: $1.62 (Product + Tax) ✓

## Summary Table

| Item | Amount |
|------|--------|
| Product Price | $1.50 |
| Tax (8%) | $0.12 |
| **Customer Pays** | **$1.62** |
| | |
| Platform Fee (minimum) | $0.50 |
| Tax (withheld) | $0.12 |
| **Platform Keeps** | **$0.62** |
| | |
| **Seller Receives** | **$1.00** |

## Key Points

- ✅ **Minimum fee applies**: Since 5.6% of $1.50 = $0.084 is less than $0.50 minimum, the platform fee is $0.50
- ✅ Seller only gets Sale Price - Platform Fee (tax excluded)
- ✅ Platform withholds tax for remittance
- ✅ Platform fee is calculated on sale price, not including tax

## Note on Tax Rate
The tax rate used here (8%) is an example. Actual tax rates vary by:
- Customer location
- Product tax code
- Local tax regulations

Stripe calculates the actual tax rate automatically based on these factors.

