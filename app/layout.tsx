import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Providers } from '@/components/providers';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import './globals.css';

import { COMPANY_INFO } from '@/lib/company-info';
import { OrganizationStructuredData, WebsiteStructuredData } from '@/components/structured-data';

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');

const siteUrl = typeof defaultUrl === 'string' ? defaultUrl : 'https://thepatternsplace.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: COMPANY_INFO.name,
    template: `%s | ${COMPANY_INFO.name}`,
  },
  description: COMPANY_INFO.tagline,
  keywords: [
    'sewing patterns',
    'crafting patterns',
    'digital patterns',
    'sewing templates',
    'craft patterns',
    'pattern marketplace',
    'independent creators',
    'sewing designs',
    'PDF patterns',
    'sewing projects',
  ],
  authors: [{ name: COMPANY_INFO.name }],
  creator: COMPANY_INFO.name,
  publisher: COMPANY_INFO.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/icons/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: COMPANY_INFO.name,
    title: COMPANY_INFO.name,
    description: COMPANY_INFO.tagline,
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: COMPANY_INFO.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: COMPANY_INFO.name,
    description: COMPANY_INFO.tagline,
    images: ['/twitter-image.png'],
    creator: COMPANY_INFO.social.twitter ? `@${COMPANY_INFO.social.twitter.split('/').pop()}` : undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add these when you have them:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased flex flex-col min-h-screen`}>
        <OrganizationStructuredData />
        <WebsiteStructuredData />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <div className="flex-1">{children}</div>
            <Footer />
            <CookieConsent />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
