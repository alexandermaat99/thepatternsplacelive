# Tax and Fee Flow Explanation

## Scenario: $0.75 Product with 8% Tax

### Customer Payment

- **Product price**: $0.75
- **Tax (8%)**: $0.06
- **Total customer pays**: $0.81

### How Stripe Processes the Payment

When using Stripe Connect with `application_fee_amount`:

1. **Stripe collects**: $0.81 (full amount from customer)
2. **Application fee (to platform)**: $0.56
   - This is calculated as: `total_amount - seller_net = $0.81 - $0.25 = $0.56`
   - Goes to **The Pattern's Place** platform account
3. **Transfer to seller**: $0.81 - $0.56 = **$0.25**
   - Goes to seller's connected Stripe account

### Where Does the Tax Money Go?

The $0.06 tax is **included in the $0.81 total**, but it's not separately tracked in the transfer. Here's what happens:

- **$0.56 goes to platform** (includes the $0.06 tax + $0.50 original fee)
- **$0.25 goes to seller** (maintains seller's net amount)

**Important**: The platform (The Pattern's Place) is responsible for:

- Remitting the $0.06 tax to tax authorities
- The tax money is effectively part of the application fee

### Why This Approach?

This maintains the seller's net earnings at $0.25 (same as before tax was implemented), while:

- Platform gets the tax amount ($0.06) to remit to authorities
- Platform fee scales proportionally with tax
- Seller earnings remain consistent

## Stripe's Expectations

Stripe expects the platform to:

1. **Calculate and collect tax** (via `automatic_tax: { enabled: true }`)
2. **Set application fee** (can be based on pre-tax or post-tax amount)
3. **Remit taxes** to appropriate tax authorities (platform responsibility)

The `application_fee_amount` is deducted from the total before transferring to the seller, so:

- If fee = $0.50: Seller gets $0.31 (includes tax benefit)
- If fee = $0.56: Seller gets $0.25 (maintains original net)

## Current Implementation

Our implementation:

- Calculates fee to maintain seller's net at pre-tax levels
- Platform receives tax amount as part of application fee
- Platform is responsible for tax remittance
