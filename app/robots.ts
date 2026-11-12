import { MetadataRoute } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = COMPANY_INFO.urls.website;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // No trailing slashes: '/dashboard/' would not block '/dashboard' itself.
        disallow: [
          '/api/',
          '/dashboard',
          '/cart',
          '/checkout',
          '/auth/',
          '/protected',
          '/test-',
          '/marketplace/success',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
