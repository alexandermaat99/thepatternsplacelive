import { MetadataRoute } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = COMPANY_INFO.urls.website;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/cart/',
          '/checkout/',
          '/auth/',
          '/protected/',
          '/test-*/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

