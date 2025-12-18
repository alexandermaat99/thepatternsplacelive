import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Providers } from '@/components/providers';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import { FeedbackBubble } from '@/components/feedback-bubble';
import './globals.css';

import { COMPANY_INFO } from '@/lib/company-info';
import { OrganizationStructuredData, WebsiteStructuredData } from '@/components/structured-data';
import { SpeedInsights } from '@vercel/speed-insights/next';

const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const siteUrl = typeof defaultUrl === 'string' ? defaultUrl : 'https://www.thepatternsplace.com';

// Google Analytics Measurement ID
const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-41YY2ZJVNN';

// Google Tag Manager Container ID
const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MVJ3TWSH';

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
      <head>
        {/* Explicit favicon links for better Google indexing */}
        <link rel="icon" href={`${siteUrl}/favicon.ico`} sizes="any" />
        <link rel="icon" href={`${siteUrl}/icons/favicon.svg`} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={`${siteUrl}/icons/apple-touch-icon.png`} />
        <link rel="manifest" href={`${siteUrl}/icons/site.webmanifest`} />
      </head>
      {/* Google Tag Manager - must load early in head */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      <body className={`${geistSans.className} antialiased flex flex-col min-h-screen`}>
        {/* Google Tag Manager (noscript) - must be immediately after opening <body> tag */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
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
            <FeedbackBubble />
          </Providers>
        </ThemeProvider>
        <SpeedInsights />
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}
        </Script>
      </body>
    </html>
  );
}
