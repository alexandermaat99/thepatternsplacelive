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
    support: 'support@thepatternsplace.com',
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
} as const;

// Helper function to get full copyright text
export function getCopyrightText() {
  return `© ${COMPANY_INFO.legal.copyrightYear} ${COMPANY_INFO.name}. All rights reserved.`;
}

// Type for easy access
export type CompanyInfo = typeof COMPANY_INFO;
