# Marketplace Setup Guide

This guide will help you set up your marketplace with Stripe integration.

## Prerequisites

- A Supabase project
- A Stripe account
- Node.js and npm installed

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## 2. Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL script

This will create:
- `profiles` table for user information
- `products` table for marketplace listings
- `orders` table for purchase records
- Row Level Security (RLS) policies
- Triggers for automatic profile creation and timestamp updates

## 3. Stripe Setup

### Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Stripe Dashboard

### Set Up Webhooks
1. In your Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the webhook signing secret to your environment variables

## 4. Features

### For Buyers
- Browse all active products
- View product details with images and descriptions
- Purchase products using Stripe Checkout
- View purchase confirmation

### For Sellers
- List new products with title, description, price, and images
- Manage their product listings
- Receive payments through Stripe

### Security
- Row Level Security (RLS) ensures users can only access their own data
- Stripe handles all payment processing securely
- Authentication required for all marketplace actions

## 5. File Structure

```
app/
├── marketplace/
│   ├── page.tsx              # Main marketplace page
│   ├── sell/
│   │   └── page.tsx          # Product listing form
│   ├── product/
│   │   └── [id]/
│   │       └── page.tsx      # Product detail page
│   └── success/
│       └── page.tsx          # Purchase success page
├── api/
│   ├── checkout/
│   │   └── route.ts          # Stripe checkout API
│   └── webhooks/
│       └── stripe/
│           └── route.ts      # Stripe webhook handler
components/
├── marketplace/
│   ├── product-card.tsx      # Product card component
│   └── product-detail.tsx    # Product detail component
lib/
└── stripe.ts                 # Stripe configuration
```

## 6. Testing

### Test Mode
- Use Stripe test keys for development
- Test card numbers: 4242 4242 4242 4242 (Visa)
- Test with small amounts first

### Production
- Switch to live Stripe keys
- Set up proper webhook endpoints
- Test the complete purchase flow

## 7. Customization

### Styling
- The marketplace uses Tailwind CSS
- Components are in `components/ui/` and `components/marketplace/`
- Customize colors and styling in `tailwind.config.ts`

### Features to Add
- Product categories and filtering
- Search functionality
- User reviews and ratings
- Seller profiles and verification
- Order management dashboard
- Email notifications
- Product images upload

## 8. Deployment

1. Deploy to Vercel or your preferred platform
2. Set environment variables in your deployment platform
3. Update webhook URLs in Stripe Dashboard
4. Test the complete flow in production

## 9. Troubleshooting

### Common Issues
- **Webhook errors**: Check webhook URL and secret
- **Database errors**: Ensure RLS policies are correct
- **Payment failures**: Verify Stripe keys and test mode
- **Authentication issues**: Check Supabase configuration

### Support
- Stripe Documentation: https://stripe.com/docs
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs 