import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { FabricDetailView } from '@/components/fabric/fabric-detail-view';
import { getFabricPublicDetail } from '@/lib/fabric-catalog';
import { COMPANY_INFO } from '@/lib/company-info';

export const revalidate = 120;

interface FabricSkuPageProps {
  params: Promise<{ sku: string }>;
}

export async function generateMetadata({ params }: FabricSkuPageProps): Promise<Metadata> {
  const { sku: rawSku } = await params;
  let decodedSku = rawSku;
  try {
    decodedSku = decodeURIComponent(rawSku);
  } catch {
    decodedSku = rawSku;
  }

  const fabric = await getFabricPublicDetail(decodedSku);
  if (!fabric) {
    return {
      title: 'Fabric not found',
      robots: { index: false, follow: false },
    };
  }

  const title = fabric.name?.trim() || fabric.sku;
  const descParts = [
    `${title} — ${fabric.sku}`,
    fabric.sell_price != null && Number.isFinite(fabric.sell_price)
      ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(fabric.sell_price)} per yard`
      : null,
    fabric.current_quantity != null && Number.isFinite(fabric.current_quantity)
      ? `${fabric.current_quantity} yd in stock`
      : null,
  ].filter(Boolean);

  const ogImage = fabric.photo_urls[0] ?? fabric.photo_url;

  return {
    title,
    description: descParts.join('. '),
    openGraph: {
      title: `${title} | ${COMPANY_INFO.name}`,
      description: descParts.join('. '),
      type: 'website',
      url: `${COMPANY_INFO.urls.website}/fabric/${encodeURIComponent(fabric.sku)}`,
      ...(ogImage
        ? {
            images: [{ url: ogImage, alt: title }],
          }
        : {}),
    },
    alternates: {
      canonical: `${COMPANY_INFO.urls.website}/fabric/${encodeURIComponent(fabric.sku)}`,
    },
  };
}

export default async function FabricSkuPage({ params }: FabricSkuPageProps) {
  const { sku: rawSku } = await params;
  let decodedSku = rawSku;
  try {
    decodedSku = decodeURIComponent(rawSku);
  } catch {
    decodedSku = rawSku;
  }

  const fabric = await getFabricPublicDetail(decodedSku);
  if (!fabric) {
    notFound();
  }

  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto max-w-screen-xl px-4 py-8 sm:py-10">
        <FabricDetailView fabric={fabric} />
      </div>
      <Footer />
    </>
  );
}
