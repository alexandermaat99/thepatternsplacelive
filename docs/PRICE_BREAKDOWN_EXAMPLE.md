# Price Breakdown Example: $15 Product with 7.45% Tax

## Transaction Details
- **Product Price**: $15.00
- **Tax Rate**: 7.45%
- **Tax Amount**: $15.00 × 7.45% = $1.1175 ≈ **$1.12** (rounded to 2 decimals)
- **Total Customer Pays**: $15.00 + $1.12 = **$16.12**

## Platform Fee Calculation
- **Platform Fee Percentage**: 5.6% (from COMPANY_INFO.fees.platformFeePercent)
- **Platform Fee on $15**: $15.00 × 5.6% = $0.84
- **Minimum Fee**: $0.50
- **Actual Platform Fee**: max($0.84, $0.50) = **$0.84** (percentage applies, not minimum)

## Money Flow

### What Customer Pays
- **Total**: $16.12 (includes product + tax)

### What Seller Receives
- **Transfer Amount** (via `transfer_data.amount`): $15.00 - $0.84 = **$14.16**
- This is: Sale Price - Platform Fee (tax excluded)

### What Platform Keeps
- **Total Collected**: $16.12
- **Transferred to Seller**: $14.16
- **Platform Keeps**: $16.12 - $14.16 = **$1.96**
  - Includes: $0.84 (platform fee) + $1.12 (tax for remittance)

## Verification
- Platform fee: $0.84 ✓
- Tax withheld: $1.12 ✓
- Total platform keeps: $0.84 + $1.12 = $1.96 ✓
- Seller receives: $14.16 (Sale Price - Platform Fee) ✓
- Customer pays: $16.12 (Product + Tax) ✓

## Summary Table

| Item | Amount |
|------|--------|
| Product Price | $15.00 |
| Tax (7.45%) | $1.12 |
| **Customer Pays** | **$16.12** |
| | |
| Platform Fee (5.6%) | $0.84 |
| Tax (withheld) | $1.12 |
| **Platform Keeps** | **$1.96** |
| | |
| **Seller Receives** | **$14.16** |

This ensures:
- ✅ Seller only gets Sale Price - Platform Fee (tax excluded)
- ✅ Platform withholds tax for remittance
- ✅ Platform fee is calculated on sale price, not including tax

