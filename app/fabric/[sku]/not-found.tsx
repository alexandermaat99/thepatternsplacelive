import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

export default function FabricDetailNotFound() {
  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto max-w-screen-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Fabric not found</h1>
        <p className="text-muted-foreground mt-2">This listing may have been removed or the link is incorrect.</p>
        <Button asChild className="mt-6">
          <Link href="/fabric">Back to in-stock fabric</Link>
        </Button>
      </div>
      <Footer />
    </>
  );
}
