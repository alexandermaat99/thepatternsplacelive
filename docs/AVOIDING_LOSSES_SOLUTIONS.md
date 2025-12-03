# Solutions to Avoid Losing Money on Transactions

## The Problem

Currently, on small transactions, Stripe fees can exceed the platform fee:

**Example: $10 sale**
- Platform fee: $10 × 5.6% = $0.56
- Stripe fees: ($10.80 × 2.9%) + $0.30 = ~$0.61
- **Platform loses: $0.05**

**Example: $1.50 sale**
- Platform fee: $0.50 (minimum)
- Stripe fees: ($1.62 × 2.9%) + $0.30 = ~$0.35
- **Platform loses: $0.15** (wait, that's actually a gain of $0.15)

Actually, let me recalculate:
- Platform fee: $0.50 (minimum)
- Stripe fees: ($1.62 × 2.9%) + $0.30 = $0.047 + $0.30 = $0.347 ≈ $0.35
- Platform net: $0.50 - $0.35 = **$0.15 profit**

So the issue is mainly on medium-sized transactions where:
- Platform fee is percentage-based (not minimum)
- But Stripe fees are on the total (including tax)

## Solutions

### Option 1: Pass Stripe Fees to Seller (Recommended)
**Change**: Set `passStripeFeesToSeller: true`

**How it works:**
- Platform fee: 5.6% (you keep)
- Stripe fees: 2.9% + $0.30 (seller pays)
- Platform net: Always 5.6% (no losses)

**On $10 sale:**
- Platform fee: $0.56 (you keep)
- Stripe fees: ~$0.61 (seller pays, deducted from their payout)
- Seller receives: $10 - $0.56 - $0.61 = $8.83
- **Platform net: $0.56** (always profitable)

**Pros:**
- Platform never loses money
- Simple to implement
- Common model (like Etsy)

**Cons:**
- Less seller-friendly
- Sellers pay more

### Option 2: Increase Minimum Fee
**Change**: Increase `minimumFeeCents` to cover Stripe fees on small transactions

**Calculation:**
- Need to cover: 2.9% + $0.30 on typical transaction
- For $10 sale with 8% tax: ($10.80 × 2.9%) + $0.30 = $0.61
- Set minimum to: $0.65 or $0.70

**Pros:**
- Platform absorbs fees (seller-friendly)
- Ensures profitability on small sales

**Cons:**
- Higher minimum may discourage small sales
- Still loses on very small transactions

### Option 3: Increase Platform Fee Percentage
**Change**: Increase `platformFeePercent` to cover Stripe fees

**Calculation:**
- Current: 5.6%
- Need: 5.6% + 2.9% = 8.5% (to cover Stripe fees)
- Or: 6% + 3% = 9% (round number)

**Pros:**
- Platform absorbs fees (seller-friendly)
- Percentage scales with sale size

**Cons:**
- Higher fees may discourage sellers
- Still need minimum to cover flat $0.30 fee

### Option 4: Calculate Platform Fee on Total (Including Tax)
**Change**: Calculate platform fee on total amount (sale + tax) instead of just sale price

**How it works:**
- Estimate tax (e.g., 8%)
- Calculate fee on: Sale × (1 + tax_rate)
- This ensures fee scales with total transaction

**On $10 sale with 8% tax:**
- Total: $10.80
- Platform fee: $10.80 × 5.6% = $0.60
- Stripe fees: ($10.80 × 2.9%) + $0.30 = $0.61
- **Still loses $0.01** (doesn't fully solve the problem)

**Pros:**
- Fee scales with transaction size
- More accurate

**Cons:**
- Requires tax estimation
- Doesn't fully solve the loss problem

### Option 5: Hybrid Approach (Best Solution)
**Change**: Combine minimum fee increase + pass some Stripe fees

**Implementation:**
1. Keep platform fee at 5.6%
2. Pass the percentage portion (2.9%) to seller
3. Platform absorbs the flat fee ($0.30)

**On $10 sale:**
- Platform fee: $0.56 (you keep)
- Stripe percentage: $10.80 × 2.9% = $0.31 (seller pays)
- Stripe flat: $0.30 (you absorb)
- Seller receives: $10 - $0.56 - $0.31 = $9.13
- **Platform net: $0.56 - $0.30 = $0.26** (profitable)

**Pros:**
- Platform always profitable
- Seller-friendly (only pays percentage, not flat fee)
- Fair distribution

**Cons:**
- More complex to implement

## Recommended Solution

**Option 1: Pass Stripe Fees to Seller** is the simplest and most common approach:

1. Change `passStripeFeesToSeller: true` in `lib/company-info.ts`
2. Update checkout routes to include Stripe fees in the fee calculation
3. Platform always keeps 5.6%, seller pays Stripe fees

This ensures:
- ✅ Platform never loses money
- ✅ Simple to implement
- ✅ Industry standard (like Etsy)
- ✅ Transparent to sellers

