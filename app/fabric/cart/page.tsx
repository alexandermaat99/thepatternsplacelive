import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { FabricCartView } from '@/components/fabric/fabric-cart-view';

export const metadata: Metadata = {
  title: 'Your fabric order',
  robots: { index: false, follow: false },
};

export default function FabricCartPage() {
  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <FabricCartView />
      </div>
      <Footer />
    </>
  );
}
