import Stripe from 'stripe';

// Only initialize Stripe on the server side
let stripe: Stripe | null = null;

export const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return stripe;
};

export const formatAmountForStripe = (amount: number, currency: string): number => {
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  const multiplier = currencies.includes(currency) ? 100 : 1;
  return Math.round(amount * multiplier);
}; 