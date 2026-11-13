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
  // Sellers pay a flat platform fee plus payment processing. No listing fee,
  // no minimum fee, no ad fees. Designed to beat Etsy (6.5% + $0.20 + ad fees).
  fees: {
    // Listing fee per sale. Set to 0: we don't charge listing fees.
    listingFeeCents: 0,

    // Platform (transaction) fee: 5% of sale price
    transactionFeePercent: 0.05, // 5%

    // Payment Processing: 3% + $0.25 (passed through to the seller)
    paymentProcessingPercent: 0.03, // 3%
    paymentProcessingFlatCents: 25, // $0.25

    // Every seller's first N sales have platform fees waived (processing still applies)
    freeSalesCount: 5,

    // Legacy fields (kept for backward compatibility, but not used)
    // These are replaced by the Etsy-style structure above
    platformFeePercent: 0.056, // Deprecated - use transactionFeePercent instead
    passStripeFeesToSeller: true as true | false | 'flat-only', // Always true with Etsy structure
    stripePercentFee: 0.03, // 3% (payment processing percentage)
    stripeFlatFeeCents: 25, // $0.25 (payment processing flat fee)

    // Minimum total fee in cents (optional floor). 0 = no minimum.
    minimumFeeCents: 0,

    // Minimum product price in dollars
    // Products must be priced at least this amount
    minimumProductPrice: 1.0,
  },
};

// Helper function to get full copyright text
export function getCopyrightText() {
  return `© ${COMPANY_INFO.legal.copyrightYear} ${COMPANY_INFO.name}. All rights reserved.`;
}

/** Fee-relevant fields from a seller's profile row. */
export type SellerFeeProfile = {
  completed_sales_count?: number | null;
  platform_fee_waived_until?: string | null;
} | null | undefined;

/**
 * Whether a seller's platform fees are waived for their next sale:
 * during their first `freeSalesCount` sales, or while they have an active
 * waiver (e.g. Founding Designers). Payment processing always applies.
 * This is the single source of truth: checkout, the webhook, and the fee
 * previews must all use it so sellers see exactly what they'll be charged.
 */
export function sellerHasFeeWaiver(profile: SellerFeeProfile, now: Date = new Date()): boolean {
  if (!profile) return false;
  if ((profile.completed_sales_count ?? 0) < COMPANY_INFO.fees.freeSalesCount) return true;
  if (profile.platform_fee_waived_until) {
    const waivedUntil = new Date(profile.platform_fee_waived_until);
    if (!Number.isNaN(waivedUntil.getTime()) && waivedUntil > now) return true;
  }
  return false;
}

/**
 * Calculate platform fees for a sale
 * @param salePriceInCents - The sale price in cents
 * @param waivePlatformFees - If true, waive platform fees (listing + transaction) but keep payment processing fees. See sellerHasFeeWaiver().
 * @returns Object with fee breakdown in cents
 */
export function calculateEtsyFees(salePriceInCents: number, waivePlatformFees: boolean = false) {
  const listingFee = waivePlatformFees ? 0 : COMPANY_INFO.fees.listingFeeCents;
  const transactionFee = waivePlatformFees
    ? 0
    : Math.round(salePriceInCents * COMPANY_INFO.fees.transactionFeePercent);
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
