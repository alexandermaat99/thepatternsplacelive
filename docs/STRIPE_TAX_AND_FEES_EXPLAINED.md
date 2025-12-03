# How Stripe Connect Handles Application Fees with Automatic Tax

## The Problem

When using Stripe Connect with `automatic_tax: enabled`:

1. **At checkout creation**: We set `application_fee_amount` based on the subtotal ($0.75)
2. **Stripe calculates tax**: Adds tax ($0.06) to get total ($0.81)
3. **Stripe processes payment**: 
   - Customer pays: $0.81
   - Application fee: $0.50 (what we set)
   - Transfer to seller: $0.81 - $0.50 = **$0.31**

**But we want**: Seller to get $0.25 (same as before tax)

## How Stripe Actually Works

According to Stripe's documentation, when you set `application_fee_amount`:
- The fee is deducted from the **total amount** (including tax)
- Transfer to seller = `amount_total - application_fee_amount`

So if:
- Total: $0.81
- Application fee: $0.50
- Seller gets: $0.31

To get seller $0.25, we need:
- Total: $0.81
- Application fee: $0.56 ($0.81 - $0.25)
- Seller gets: $0.25

## The Challenge

**We don't know the tax amount at checkout creation time!**

Stripe calculates tax AFTER we create the checkout session, based on:
- Customer's location
- Product tax code
- Tax rates in that jurisdiction

So we can't calculate the exact fee upfront.

## Options

### Option 1: Accept Seller Benefits from Tax (Current Behavior)
- Application fee: $0.50 (on subtotal)
- Seller gets: $0.31 (includes tax benefit)
- **Pros**: Simple, seller benefits
- **Cons**: Inconsistent seller earnings

### Option 2: Calculate Fee on Estimated Tax (What We Tried)
- Estimate tax (e.g., 8%)
- Calculate fee: $0.81 - $0.25 = $0.56
- **Pros**: Maintains seller net
- **Cons**: Inaccurate if actual tax differs

### Option 3: Use Percentage-Based Fee
- Use `application_fee_percent` instead of `application_fee_amount`
- Fee scales automatically with total (including tax)
- **Pros**: Always accurate
- **Cons**: Doesn't support minimum fee requirement

### Option 4: Post-Transaction Adjustment (Not Possible)
- Calculate correct fee in webhook
- Adjust the transfer
- **Problem**: Stripe doesn't allow changing application fee after payment

## Recommended Solution

Since we can't know tax at checkout creation, we have two realistic options:

1. **Keep fee on subtotal** - Seller gets tax benefit (current Stripe behavior)
2. **Use percentage fee** - Abandon minimum fee, use `application_fee_percent`

The user needs to decide which approach aligns with their business model.

