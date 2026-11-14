import type { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';
import { Navigation } from '@/components/navigation';
import { PlatformBanner } from '@/components/platform-banner';
import { FoundingDesignersSpotlight } from '@/components/marketplace/founding-designers-spotlight';
import { HomeFabricRow } from '@/components/home/home-fabric-row';
import { HomeNewPatterns } from '@/components/home/home-new-patterns';
import { HomeHowItWorks, HomeSellCta } from '@/components/home/home-how-and-sell';
import { WhyDifferent } from '@/components/home/why-different';

// The homepage title is the most important one on the site. Lead with what
// people search for, then the brand.
const HOME_TITLE = `Indie Sewing & Knitting Patterns | ${COMPANY_INFO.name}`;

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description:
    'Indie sewing and knitting patterns from independent designers, plus curated deadstock fabric to sew them. Instant PDF downloads. AI-generated patterns aren\'t allowed.',
  openGraph: {
    title: HOME_TITLE,
    description: 'Discover modern sewing and crafting patterns from independent designers.',
    url: `${COMPANY_INFO.urls.website}/`,
    type: 'website',
    images: [
      {
        url: `${COMPANY_INFO.urls.website}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: COMPANY_INFO.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: 'Discover modern sewing and crafting patterns from independent designers.',
    images: [`${COMPANY_INFO.urls.website}/twitter-image.png`],
  },
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/`,
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
};

export default function Home() {
  return (
    <div className="bg-background">
      <Navigation showMarketplaceLinks={true} />
      <PlatformBanner />
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background via-background to-muted/40">
        <div className="container mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                Independent designers · PDF patterns · Human-made
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Indie sewing patterns,{' '}
                  <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent">
                    straight from the designers
                  </span>
                </h1>
                <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                  Sewing and knitting patterns from independent designers, and curated deadstock
                  fabric to sew them in. AI-generated patterns aren&apos;t allowed, and we review
                  listings.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  Browse patterns
                </a>
                <a
                  href="/marketplace/sell"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  Sell your patterns
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground sm:text-sm">
                <span>Instant PDF downloads</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>Curated deadstock fabric</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>Secure checkout</span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <WhyDifferent />
            </div>
          </div>
        </div>
      </section>

      {/* Each section hides itself when it has nothing to show, so the page grows with the catalog. */}
      <HomeNewPatterns />
      <FoundingDesignersSpotlight />
      <HomeFabricRow />
      <HomeHowItWorks />
      <HomeSellCta />
    </div>
  );
}
