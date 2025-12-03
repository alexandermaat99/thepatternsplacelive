# Flat Fee Only Passthrough Implementation

## What Changed

Modified fee structure to pass **only the $0.30 flat fee** to sellers, while the platform absorbs the **2.9% percentage fee**.

This is a hybrid approach that balances profitability with seller-friendliness.

## How It Works

### Fee Structure

- **Platform Fee**: 5.6% of sale price (you keep)
- **Stripe Percentage Fee**: 2.9% (platform absorbs)
- **Stripe Flat Fee**: $0.30 (passed to seller)

### Example: $10 Sale

**Customer Pays:**

- Product: $10.00
- Tax (8%): $0.80
- **Total: $10.80**

**Fees:**

- Platform fee: $10 × 5.6% = **$0.56** (you keep)
- Stripe percentage: $10.80 × 2.9% = **$0.31** (you absorb)
- Stripe flat: **$0.30** (seller pays)

**Seller Receives:**

- Sale Price: $10.00
- Platform Fee: -$0.56
- Stripe Flat Fee: -$0.30
- **Seller Gets: $9.14**

**Platform Net:**

- Platform Fee: $0.56
- Stripe Percentage (absorbed): -$0.31
- **Platform Net: $0.25** ✅ (profitable)

## Comparison

### Option 1: Platform Absorbs All (Previous)

- Platform net: $0.56 - $0.61 = **-$0.05** ❌ (loses money)

### Option 2: Seller Pays All (Full Passthrough)

- Platform net: **$0.56** ✅ (always profitable)
- Seller pays: $0.59 total

### Option 3: Flat Fee Only (Current - Hybrid)

- Platform net: $0.56 - $0.31 = **$0.25** ✅ (profitable)
- Seller pays: $0.30 (only flat fee)

## Benefits

✅ **Platform profitable** - Net positive on all transactions
✅ **Seller-friendly** - Only pays $0.30, not the percentage
✅ **Fair distribution** - Platform absorbs variable percentage, seller pays fixed flat
✅ **Scales well** - On larger sales, platform keeps more (percentage scales up)

## Configuration

Set in `lib/company-info.ts`:

```typescript
passStripeFeesToSeller: 'flat-only';
```

Options:

- `false` - Platform absorbs all fees
- `'flat-only'` - Only pass $0.30 flat fee
- `true` - Pass all fees (percentage + flat)
