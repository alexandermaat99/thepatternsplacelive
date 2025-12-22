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
    general: 'thepatternsplacemarketplace@gmail.com',
    support: 'thepatternsplacemarketplace@gmail.com',
    privacy: 'thepatternsplacemarketplace@gmail.com',
    legal: 'thepatternsplacemarketplace@gmail.com',
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
    website: 'https://www.thepatternsplace.com',
    privacy: '/privacy',
    terms: '/terms',
    marketplace: '/marketplace',
  },

  // Platform Features & Announcements
  banner: {
    // Toggle to show/hide the new platform banner
    showNewPlatformBanner: true,
  },

  // Platform Fees & Revenue
  // Etsy-style fee structure
  fees: {
    // Listing Fee: $0.20 per sale (charged each time item sells)
    listingFeeCents: 20, // $0.20

    // Transaction Fee: 6.5% of sale price (like Etsy)
    transactionFeePercent: 0.065, // 6.5%

    // Payment Processing: 3% + $0.25 (like Etsy)
    paymentProcessingPercent: 0.03, // 3%
    paymentProcessingFlatCents: 25, // $0.25

    // Legacy fields (kept for backward compatibility, but not used)
    // These are replaced by the Etsy-style structure above
    platformFeePercent: 0.056, // Deprecated - use transactionFeePercent instead
    passStripeFeesToSeller: true as true | false | 'flat-only', // Always true with Etsy structure
    stripePercentFee: 0.03, // 3% (payment processing percentage)
    stripeFlatFeeCents: 25, // $0.25 (payment processing flat fee)

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

/**
 * Calculate Etsy-style platform fees for a sale
 * @param salePriceInCents - The sale price in cents
 * @param waivePlatformFees - If true, waive platform fees (listing + transaction) but keep payment processing fees. Used for first 5 sales.
 * @returns Object with fee breakdown in cents
 */
export function calculateEtsyFees(salePriceInCents: number, waivePlatformFees: boolean = false) {
  const listingFee = waivePlatformFees ? 0 : COMPANY_INFO.fees.listingFeeCents; // $0.20
  const transactionFee = waivePlatformFees ? 0 : Math.round(salePriceInCents * COMPANY_INFO.fees.transactionFeePercent); // 6.5%
  const paymentProcessingPercent = Math.round(
    salePriceInCents * COMPANY_INFO.fees.paymentProcessingPercent
  ); // 3%
  const paymentProcessingFlat = COMPANY_INFO.fees.paymentProcessingFlatCents; // $0.25

  const totalFee = listingFee + transactionFee + paymentProcessingPercent + paymentProcessingFlat;
  // Only apply minimum fee if platform fees are not waived
  const finalFee = waivePlatformFees 
    ? totalFee 
    : Math.max(totalFee, COMPANY_INFO.fees.minimumFeeCents);

  return {
    listingFee,
    transactionFee,
    paymentProcessing: paymentProcessingPercent + paymentProcessingFlat,
    totalFee: finalFee,
    // For backward compatibility
    platformFee: finalFee,
    stripeFee: 0, // Payment processing is included in total fee
    waivePlatformFees, // Include flag in return for transparency
  };
}

// Type for easy access
export type CompanyInfo = typeof COMPANY_INFO;
