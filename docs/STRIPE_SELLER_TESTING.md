# Stripe Seller Testing Guide

This guide will help you test the complete Stripe Connect seller flow to ensure everything works correctly for sellers on your marketplace.

## Prerequisites

1. **Stripe Test Mode Account**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
   - Make sure you're in **Test Mode** (toggle in the top right)
   - You'll need your test API keys

2. **Environment Variables**
   Make sure your `.env.local` has:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...  # Test key, not live!
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # Test webhook secret
   ```

3. **Stripe CLI (for local webhook testing)**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe  # macOS
   # or download from https://stripe.com/docs/stripe-cli
   
   # Login to Stripe
   stripe login
   
   # Forward webhooks to local server (run in separate terminal)
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   This will give you a webhook secret starting with `whsec_` - use this in your `.env.local`

## Testing Workflow

### Step 1: Test Seller Account Creation

1. **Create a test seller account**
   - Sign up/login to your app as a seller
   - Go to `/marketplace/sell` or `/dashboard`
   - You should see a "Connect with Stripe" button

2. **Connect Stripe Account**
   - Click "Connect with Stripe"
   - You'll be redirected to Stripe's onboarding flow
   - **Use Stripe's test data**:
     - **Email**: Use any test email (e.g., `seller@test.com`)
     - **Phone**: `+1 555-555-5555`
     - **Business Type**: Individual or Company (both work in test mode)
     - **Business Name**: "Test Seller Business"
     - **Address**: Use any test address
     - **SSN/EIN**: For test mode, use:
       - **SSN**: `000-00-0000` (for individuals)
       - **EIN**: `12-3456789` (for businesses)
     - **Bank Account**: Use Stripe's test account numbers:
       - **Account Number**: `000123456789`
       - **Routing Number**: `110000000` (for US)
     - **Skip verification steps** - in test mode, you can skip most verification

3. **Complete Onboarding**
   - Fill out all required fields
   - Click through to completion
   - You should be redirected back to your dashboard

4. **Verify Account Status**
   - Check your dashboard - it should show your Stripe account is connected
   - In Stripe Dashboard → Connect → Accounts, you should see the new test account
   - The account should show:
     - ✅ Details submitted
     - ✅ Charges enabled (may take a moment)
     - ⚠️ Payouts enabled (may be pending in test mode)

### Step 2: Test Product Listing

1. **List a Product**
   - Go to `/marketplace/sell`
   - Fill out the product form:
     - Title: "Test Product"
     - Description: "This is a test product"
     - Price: `10.00` (USD)
     - Upload an image
   - Submit the form

2. **Verify Product Created**
   - Check `/marketplace` - your product should appear
   - Click on it to view details

### Step 3: Test Purchase Flow (as Buyer)

1. **Create a Test Buyer Account**
   - Use a different browser/incognito window
   - Sign up as a different user (buyer@test.com)
   - This simulates a real buyer

2. **Purchase the Product**
   - Browse to your test product
   - Click "Buy Now" or add to cart
   - Use Stripe test card numbers:
     - **Success**: `4242 4242 4242 4242`
     - **Decline**: `4000 0000 0000 0002`
     - **3D Secure**: `4000 0025 0000 3155`
   - **Expiry**: Any future date (e.g., `12/34`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)

3. **Complete Checkout**
   - Fill in the test card details
   - Submit payment
   - You should be redirected to success page

### Step 4: Verify Payment Processing

1. **Check Stripe Dashboard**
   - Go to Stripe Dashboard → Payments
   - You should see the test payment
   - Status should be "Succeeded"
   - **Check Connect → Accounts**: Go to the seller's connected account
   - You should see the payment transferred to the seller's account
   - The seller should see the payment in their Stripe Dashboard (if they have access)

2. **Check Webhook Events**
   - Go to Stripe Dashboard → Developers → Events
   - Look for `checkout.session.completed` event
   - Verify the webhook was received

3. **Check Database**
   - In your Supabase dashboard, check the `orders` table
   - There should be a new order record with:
     - `product_id`: Your test product ID
     - `buyer_id`: The buyer's user ID
     - `seller_id`: Your seller user ID
     - `status`: `completed`
     - `amount`: The product price

4. **Verify Payment Transfer**
   - In Stripe Dashboard → Connect → Accounts → [Seller Account] → Payments
   - You should see the transferred payment
   - The platform account will show the payment as a transfer (not a charge)

### Step 5: Test Multiple Scenarios

#### Test 1: Seller Onboarding Incomplete
1. Create a seller account but don't complete Stripe onboarding
2. Try to list a product
3. **Expected**: Should see message that Stripe account must be connected

#### Test 2: Payment Failure
1. As a buyer, try to purchase with card `4000 0000 0000 0002`
2. **Expected**: Payment should be declined, user sees error

#### Test 3: Cart Checkout
1. Add multiple products from the same seller to cart
2. Checkout with test card
3. **Expected**: All products should be purchased, orders created for each, payment transferred to seller
4. **Note**: Multi-seller carts currently transfer to first seller only (see Important Notes above)

#### Test 4: Webhook Handling
1. In Stripe Dashboard → Developers → Events
2. Find a `checkout.session.completed` event
3. Click "Send test webhook" to resend
4. **Expected**: Your webhook handler should process it (check server logs)

### Step 6: Test Account Status Checking

1. **Check Account Status API**
   - In browser console or using curl:
   ```bash
   curl -X POST http://localhost:3000/api/check-stripe-account \
     -H "Content-Type: application/json" \
     -d '{"accountId": "acct_..."}'
   ```
   - Should return account status

2. **Test Refresh Flow**
   - If account is not fully onboarded, seller should be able to click "Connect with Stripe" again
   - Should redirect to complete missing information

## Important Notes

### ✅ Payment Splitting Implementation

**Payment Splitting**: Payments are now automatically split to sellers using Stripe Connect's `transfer_data`. When a buyer purchases a product:

1. **Payment goes to seller's Stripe account**: The full payment (minus Stripe fees) is transferred directly to the seller's connected Stripe account
2. **Platform fee**: Currently set to $0. To add a platform fee, edit:
   - `app/api/checkout/route.ts` - Uncomment and set `application_fee_amount`
   - `app/api/checkout/cart/route.ts` - Uncomment and set `application_fee_amount`
3. **Multi-seller carts**: Currently, if a cart contains products from multiple sellers, the entire payment goes to the first seller. For proper multi-seller support, consider:
   - Splitting into separate checkout sessions per seller
   - Using Payment Intents with manual transfers in the webhook
   - Limiting carts to single-seller only

### Platform Fee Configuration

To add a platform fee (e.g., 5%), update the checkout routes:

```typescript
// In app/api/checkout/route.ts and app/api/checkout/cart/route.ts
const platformFeeAmount = Math.round(product.price * 0.05 * 100); // 5% fee
// Then uncomment: application_fee_amount: platformFeeAmount,
```

### Test Mode vs Live Mode

- **Test Mode**: Use for all development and testing
  - No real money is processed
  - Test cards work
  - Webhooks can be tested with Stripe CLI
  - Accounts can be created instantly

- **Live Mode**: Only use when ready for production
  - Real money is processed
  - Real bank accounts required
  - Real verification required
  - Webhooks must be configured on production URL

### Common Issues & Solutions

1. **"Account not onboarded" error**
   - Solution: Complete all required fields in Stripe onboarding
   - Check account status in Stripe Dashboard

2. **Webhook not received**
   - Solution: Use Stripe CLI for local testing
   - Check webhook secret matches
   - Verify webhook endpoint URL is correct

3. **Payment succeeds but order not created**
   - Solution: Check webhook handler logs
   - Verify webhook secret is correct
   - Check database connection

4. **"Charges not enabled"**
   - Solution: Complete all onboarding steps
   - Wait a few minutes for Stripe to process
   - Check account status in Stripe Dashboard

## Testing Checklist

- [ ] Seller can create Stripe Connect account
- [ ] Seller completes onboarding successfully
- [ ] Seller account status shows as "onboarded"
- [ ] Seller can list products after connecting
- [ ] Buyer can purchase products
- [ ] Payment succeeds with test card
- [ ] Webhook receives `checkout.session.completed` event
- [ ] Order is created in database
- [ ] Multiple products in cart work correctly
- [ ] Payment failures are handled gracefully
- [ ] Account status checking works
- [ ] Incomplete onboarding blocks product listing

## Stripe Test Cards Reference

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | 3D Secure authentication required |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 3220` | Requires authentication |

All test cards:
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

## Next Steps

1. **Implement Payment Splitting**: Modify checkout to use Stripe Connect for seller payouts
2. **Add Seller Dashboard**: Show earnings, payouts, sales history
3. **Add Email Notifications**: Notify sellers of new sales
4. **Add Payout Management**: Allow sellers to request payouts
5. **Add Analytics**: Track seller performance

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

