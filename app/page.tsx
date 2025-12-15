import type { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/company-info';
import MarketplacePage from './marketplace/page';
import { Navigation } from '@/components/navigation';
import { PlatformBanner } from '@/components/platform-banner';

export const metadata: Metadata = {
  title: COMPANY_INFO.name,
  description:
    'Discover modern sewing and crafting patterns from independent designers. Browse featured patterns, filter by category, and start your next project.',
  openGraph: {
    title: COMPANY_INFO.name,
    description: 'Discover modern sewing and crafting patterns from independent designers.',
    url: COMPANY_INFO.urls.website,
    type: 'website',
  },
  alternates: {
    canonical: COMPANY_INFO.urls.website,
  },
};

export default function Home(props: any) {
  return (
    <div className="bg-background">
      <Navigation showMarketplaceLinks={true} />
      <PlatformBanner />
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-background via-background to-muted/40">
        <div className="container mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                Digital sewing & crafting patterns marketplace
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Find your next{' '}
                  <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent">
                    favorite pattern
                  </span>
                </h1>
                <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                  Browse curated digital patterns from independent designers.
                  <span className="text-rose-400 font-semibold"> Download</span> instantly,{' '}
                  <span className="text-rose-400 font-semibold"> print</span> at home, and start{' '}
                  <span className="text-rose-400 font-semibold"> sew</span>ing within minutes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  Browse all patterns
                </a>
                <a
                  href="/marketplace/sell"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  Sell your patterns
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground sm:text-sm">
                <span>Instant digital downloads</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>Secure payments</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>Community rated patterns</span>
              </div>
            </div>

            <div className="relative hidden h-full lg:block">
              <div className="absolute inset-0 -translate-x-6 rounded-3xl bg-gradient-to-br from-rose-500/20 via-rose-500/20 to-rose-500/20 blur-3xl" />
              <div className="relative rounded-3xl border bg-background/80 p-6 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Featured categories
                    </p>
                    <p className="text-sm text-foreground">Dresses, tops, accessories & more</p>
                  </div>
                  {/* <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                    idk
                  </span> */}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-2 rounded-2xl bg-muted p-3">
                    <p className="font-semibold">Community rated</p>
                    <p className="text-muted-foreground">
                      See what other makers think about a pattern before you buy.
                    </p>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-muted p-3">
                    <p className="font-semibold">Community focused</p>
                    <p className="text-muted-foreground">
                      We're dedicated to cultivating the best community for you!
                    </p>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-muted p-3">
                    <p className="font-semibold">PDF Patterns</p>
                    <p className="text-muted-foreground">Print at home or send to a copy shop.</p>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-muted p-3">
                    <p className="font-semibold">Pattern points</p>
                    <p className="text-muted-foreground">
                      Collect pattern points to earn free patterns and other rewards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Marketplace Section */}
      <section aria-label="Marketplace">
        {/* Reuse existing marketplace page/component so filters, pagination, and SEO logic stay consistent */}
        <MarketplacePage {...props} />
      </section>
    </div>
  );
}
