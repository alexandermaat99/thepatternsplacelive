import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Providers } from '@/components/providers';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import { FeedbackBubble } from '@/components/feedback-bubble';
import './globals.css';

import { COMPANY_INFO } from '@/lib/company-info';
import { SpeedInsights } from '@vercel/speed-insights/next';

const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Always use www version for consistency
const siteUrl = typeof defaultUrl === 'string' 
  ? (defaultUrl.includes('localhost') ? defaultUrl : COMPANY_INFO.urls.website)
  : COMPANY_INFO.urls.website;

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
      { url: `${siteUrl}/favicon.ico`, sizes: 'any' },
      { url: `${siteUrl}/icons/favicon.ico`, sizes: 'any' },
      { url: `${siteUrl}/icons/favicon.svg`, type: 'image/svg+xml' },
      { url: `${siteUrl}/icons/favicon-96x96.png`, sizes: '96x96', type: 'image/png' },
    ],
    apple: `${siteUrl}/icons/apple-touch-icon.png`,
    shortcut: `${siteUrl}/favicon.ico`,
  },
  manifest: `${siteUrl}/icons/site.webmanifest`,
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
    creator: COMPANY_INFO.social.twitter
      ? `@${COMPANY_INFO.social.twitter.split('/').pop()}`
      : undefined,
  },
  robots: {
    index: true,
    follow: true,
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
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icons/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/icons/site.webmanifest" />
      </head>
      <body className={`${geistSans.className} antialiased flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <div className="flex-1">{children}</div>
            <Footer />
            <CookieConsent />
            <FeedbackBubble />
          </Providers>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
