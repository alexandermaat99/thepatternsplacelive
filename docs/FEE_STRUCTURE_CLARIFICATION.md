# Fee Structure Clarification

## Current Implementation

Based on the code, here's how fees are structured:

### Platform Fee
- **Rate**: 5.6% of sale price
- **Minimum**: $0.50
- **What it is**: The fee the platform charges sellers

### Stripe Fees
- **Rate**: 2.9% + $0.30 per transaction
- **Who pays**: Platform (because `passStripeFeesToSeller: false`)
- **What it is**: Stripe's processing fees (separate from platform fee)

## Current Structure (Separate Fees)

**On a $10 sale:**
- Platform fee: $10 × 5.6% = **$0.56** (charged to seller)
- Stripe fees: ($10.80 × 2.9%) + $0.30 = **~$0.61** (paid by platform)
- Platform net: $0.56 - $0.61 = **-$0.05** (loses money after Stripe fees)

## Alternative Interpretation (Inclusive Fees)

If the 5.6% platform fee **includes** the 2.9% Stripe fee, then:

**On a $10 sale:**
- Total charged: $10 × 5.6% = **$0.56**
- Stripe takes: ($10.80 × 2.9%) + $0.30 = **~$0.61**
- Platform net: $0.56 - $0.61 = **-$0.05** (still loses money)

Wait, that doesn't work either because Stripe fees are on the total ($10.80), not the sale price.

## The Question

You're asking: **Is the 5.6% platform fee meant to include/cover the 2.9% Stripe fee?**

If yes, the structure would be:
- Platform charges seller: 5.6%
- Stripe takes: 2.9% + $0.30 (from platform)
- Platform net: 5.6% - 2.9% = **2.7%** (minus $0.30 flat fee)

But currently, the code treats them as **separate**:
- Platform fee: 5.6% (revenue)
- Stripe fees: 2.9% + $0.30 (cost, absorbed by platform)

## Recommendation

If you want the 5.6% to be the **total** fee (including Stripe's 2.9%), then:
- Platform's actual take: 5.6% - 2.9% = **2.7%** (plus you still pay the $0.30 flat fee)

This would mean on a $10 sale:
- Platform charges: $0.56 (5.6%)
- Stripe fees: ~$0.61 (2.9% + $0.30)
- Platform net: $0.56 - $0.61 = **-$0.05** (negative because Stripe fees exceed platform fee on small transactions)

**Which structure do you want?**
1. **Separate**: Platform fee 5.6% + Platform absorbs Stripe fees separately (current)
2. **Inclusive**: Platform fee 5.6% includes Stripe's 2.9%, so platform net is 2.7%

