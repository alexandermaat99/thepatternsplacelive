/**
 * Company information constants
 * Update these values in one place to reflect across the entire site
 */

export const COMPANY_INFO = {
  // Company Details
  name: "The Pattern's Place",
  shortName: 'TPP',
  tagline: 'Your destination for unique sewing and crafting patterns from independent creators.',

  // Contact Information
  email: {
    general: 'hello@thepatternsplace.com',
    support: 'thepatternsplacemarketplace@gmail.com',
    privacy: 'thepatternsplace@gmail.com',
    legal: 'legal@thepatternsplace.com',
  },

  phone: {
    main: '', // Add phone number when available, e.g., '+1 (555) 123-4567'
    support: '',
  },

  // Address (when applicable)
  address: {
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    full: '', // e.g., '123 Main St, City, State 12345'
  },

  // Social Media Links
  social: {
    instagram: 'https://instagram.com/thepatternsplace',
    facebook: '',
    pinterest: '',
    twitter: '',
    youtube: '',
    tiktok: '',
  },

  // Legal
  legal: {
    companyType: '', // e.g., 'LLC', 'Inc.'
    jurisdiction: 'United States',
    copyrightYear: new Date().getFullYear(),
  },

  // URLs
  urls: {
    website: 'https://thepatternsplace.com',
    privacy: '/privacy',
    terms: '/terms',
    marketplace: '/marketplace',
  },

  // Platform Fees & Revenue
  // This is how The Pattern's Place makes money - a percentage of each sale
  fees: {
    // Platform transaction fee percentage (like Etsy's 6.5%, we charge 6%)
    // This is taken from the seller's payout
    platformFeePercent: 0.056, // 5.5% transaction fee

    // Whether to pass Stripe's processing fees to the seller
    // true = Seller pays all Stripe fees (like Etsy) - you keep more
    // false = Platform absorbs all Stripe fees - seller-friendly
    // 'flat-only' = Only pass the flat fee ($0.30), platform absorbs percentage (2.9%)
    passStripeFeesToSeller: 'flat-only' as true | false | 'flat-only', // Only pass $0.30 flat fee, platform absorbs 2.9%

    // Stripe's approximate fees (used for calculation when passing to seller)
    // These are estimates - actual Stripe fees may vary slightly
    stripePercentFee: 0.029, // 2.9% (platform absorbs this)
    stripeFlatFeeCents: 30, // $0.30 (passed to seller)

    // Minimum platform fee in cents (optional floor)
    // e.g., 50 = $0.50 minimum fee per transaction
    minimumFeeCents: 50,

    // Minimum product price in dollars
    // Products must be priced at least this amount
    minimumProductPrice: 1.0,
  },
};

// Helper function to get full copyright text
export function getCopyrightText() {
  return `© ${COMPANY_INFO.legal.copyrightYear} ${COMPANY_INFO.name}. All rights reserved.`;
}

// Type for easy access
export type CompanyInfo = typeof COMPANY_INFO;
