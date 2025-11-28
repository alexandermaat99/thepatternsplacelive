import { Navigation } from '@/components/navigation';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <Navigation showMarketplaceLinks={true} />
      {children}
    </div>
  );
}

