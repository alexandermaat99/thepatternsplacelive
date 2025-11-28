import { Navigation } from '@/components/navigation';

export default function CheckoutLayout({
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

