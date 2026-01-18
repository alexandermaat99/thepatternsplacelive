import { COMPANY_INFO } from '@/lib/company-info';

interface ProductStructuredDataProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
      username?: string;
      full_name?: string;
    } | null;
    product_categories?: Array<{
      category?: {
        name: string;
        slug: string;
      } | null;
    }> | null;
  };
}

export function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const baseUrl = COMPANY_INFO.urls.website;
  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${baseUrl}${product.image_url}`
    : `${baseUrl}/opengraph-image.png`;

  const sellerName = product.profiles?.full_name || product.profiles?.username || 'Creator';
  const categories =
    product.product_categories
      ?.map(pc => pc?.category?.name)
      .filter(Boolean)
      .join(', ') || 'Pattern';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: imageUrl,
    brand: {
      '@type': 'Brand',
      name: sellerName,
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/marketplace/product/${product.id}`,
      priceCurrency: 'USD',
      price: Number(product.price).toFixed(2),
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: sellerName,
      },
    },
    category: categories,
    aggregateRating: {
      '@type': 'AggregateRating',
      // These would be populated from reviews if available
      ratingValue: '4.5',
      reviewCount: '0',
    },
  };

  // Sanitize JSON to prevent XSS - escape any HTML entities
  const jsonString = JSON.stringify(structuredData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonString }} />;
}

export function OrganizationStructuredData() {
  const baseUrl = COMPANY_INFO.urls.website;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_INFO.name,
    url: baseUrl,
    logo: `${baseUrl}/icons/web-app-manifest-512x512.png`,
    description: COMPANY_INFO.tagline,
    contactPoint: {
      '@type': 'ContactPoint',
      email: COMPANY_INFO.email.general,
      contactType: 'customer service',
    },
    sameAs: [
      COMPANY_INFO.social.instagram,
      COMPANY_INFO.social.facebook,
      COMPANY_INFO.social.pinterest,
      COMPANY_INFO.social.twitter,
      COMPANY_INFO.social.youtube,
    ].filter(Boolean),
  };

  // Sanitize JSON to prevent XSS - escape any HTML entities
  const jsonString = JSON.stringify(structuredData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonString }} />;
}

export function WebsiteStructuredData() {
  const baseUrl = COMPANY_INFO.urls.website;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: COMPANY_INFO.name,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/marketplace?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Sanitize JSON to prevent XSS - escape any HTML entities
  const jsonString = JSON.stringify(structuredData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonString }} />;
}

export function BreadcrumbStructuredData({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const baseUrl = COMPANY_INFO.urls.website;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };

  // Sanitize JSON to prevent XSS - escape any HTML entities
  const jsonString = JSON.stringify(structuredData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonString }} />;
}
