# Why Percentage Fee Doesn't Solve the Problem

## The Math

### Current Situation (Fixed Fee)
- Subtotal: $0.75
- Fee: $0.50 (minimum, since 5.6% of $0.75 = $0.042)
- Seller net (pre-tax): $0.25
- With tax: Total = $0.81
- Seller gets: $0.81 - $0.50 = **$0.31** (includes tax benefit)

### What We Want
- Total: $0.81
- Seller net: $0.25 (maintain pre-tax net)
- Fee needed: $0.81 - $0.25 = **$0.56**

### If We Use Percentage Fee (5.6%)
- Fee = $0.81 × 5.6% = **$0.045**
- Seller gets: $0.81 - $0.045 = **$0.765**

**This is WORSE!** The fee is way too small because:
1. 5.6% is the platform fee percentage, not designed for this calculation
2. It ignores the minimum fee requirement ($0.50)
3. Seller gets way more than intended

### To Get $0.56 Fee with Percentage
- Fee = $0.81 × X = $0.56
- X = $0.56 ÷ $0.81 = **69.1%**

This makes no sense! We'd need a 69% fee rate, which is not our platform fee.

## The Real Problem

**We can't use percentage fees because:**
1. Our fee structure is: `max(5.6% of subtotal, $0.50 minimum)`
2. Percentage fees don't support minimums
3. The fee we need ($0.56) is not a percentage - it's: `total - desired_seller_net`

## Why Percentage Fee Was Suggested (Incorrectly)

I mistakenly thought percentage fees would "scale with tax" but that's not the right solution because:
- The fee should maintain seller net at $0.25
- That requires: `fee = total - $0.25`
- This is NOT a percentage calculation - it's a fixed net amount calculation

## The Actual Solutions

Since we can't know tax at checkout creation, we have:

1. **Accept current behavior**: Seller gets $0.31 (benefits from tax)
2. **Estimate tax**: Calculate fee assuming ~8% tax (you rejected this)
3. **Post-payment adjustment**: Not possible - Stripe doesn't allow changing fees after payment

**There is no perfect solution** because Stripe calculates tax AFTER we set the fee.

