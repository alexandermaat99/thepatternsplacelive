import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Instagram } from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { FabricCatalogGrid } from '@/components/fabric/fabric-catalog-grid';
import { getFabricCatalogRows } from '@/lib/fabric-catalog';
import { COMPANY_INFO } from '@/lib/company-info';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'In-stock fabric',
  description: `Browse in-stock fabric at ${COMPANY_INFO.name}: photos, SKU, price per yard, and current yardage.`,
  openGraph: {
    title: `In-stock fabric | ${COMPANY_INFO.name}`,
    description: `Browse in-stock fabric: photos, SKU, price per yard, and current yardage.`,
    type: 'website',
    url: `${COMPANY_INFO.urls.website}/fabric`,
  },
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/fabric`,
  },
};

export default async function FabricCatalogPage() {
  const rows = await getFabricCatalogRows();

  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto max-w-screen-xl px-4 py-8 sm:py-10">
        <div className="mb-8 space-y-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <header className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">In-stock fabric</h1>
            <p className="text-muted-foreground">
              Current yardage and price per yard. Currently only selling in person in the Utah
              Valley area. Follow us on Instagram{' '}
              <Link
                href="https://www.instagram.com/thepatternsplace/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                @thepatternsplace
              </Link>{' '}
              for updates on when we're selling in person!
            </p>
          </header>
        </div>

        <FabricCatalogGrid rows={rows} />
      </div>
      <Footer />
    </>
  );
}
