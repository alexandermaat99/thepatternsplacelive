# Etsy vs The Pattern's Place: Seller Fees

Rates live in `lib/company-info.ts` (`COMPANY_INFO.fees`), and `calculateEtsyFees()` computes them. If you change the rates, update this doc too.

## Current rates

| | Etsy | The Pattern's Place |
|---|---|---|
| Listing fee | $0.20 per sale | **None** |
| Transaction / platform fee | 6.5% | **5%** |
| Payment processing | 3% + $0.25 | 3% + $0.25 |
| Ad fees | 15% on Offsite Ads sales (12% over $10k/yr) | **None** |
| Minimum fee | n/a | None |
| Waivers | none | Platform fee waived on each seller's **first 5 sales**, and for **Founding Designers** until `profiles.platform_fee_waived_until` |

## On a $10 pattern

| | Fees | Seller receives |
|---|---|---|
| Etsy (organic sale) | $1.40 | $8.60 |
| Etsy (Offsite Ads sale) | $2.90 | $7.10 |
| **TPP (standard)** | **$1.05** | **$8.95** |
| **TPP (first 5 sales / Founding Designer)** | **$0.55** | **$9.45** |

TPP's standard fee breaks down as $0.50 platform (5%) + $0.30 processing (3%) + $0.25 processing flat.

## Platform economics (destination charges)

The platform pays Stripe about 2.9% + $0.30 per card charge (US cards; international cards cost more). Stripe Connect Express also bills per active connected account and per payout. Check current Connect pricing, because daily payouts mean a payout fee every day a seller has a balance.

- **Standard sale ($10):** the platform collects $1.05 and pays Stripe about $0.59, netting about $0.46 before Connect account and payout fees.
- **Waived sale ($10):** the platform collects $0.55 and pays Stripe about $0.59, a small loss (about -$0.04) per sale. That's the cost of the free-sales and Founding Designer programs.
