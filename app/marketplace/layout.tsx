import { Navigation } from '@/components/navigation';
import { PlatformBanner } from '@/components/platform-banner';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <Navigation showMarketplaceLinks={true} />
      <PlatformBanner />
      {children}
    </div>
  );
}
