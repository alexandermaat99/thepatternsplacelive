import { redirect } from 'next/navigation';
import { getCurrentUserWithProfileServer } from '@/lib/auth-helpers-server';
import { Navigation } from '@/components/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authData = await getCurrentUserWithProfileServer();

  if (!authData?.user) {
    redirect('/');
  }

  if (!authData.profile?.admin) {
    redirect('/dashboard');
  }

  return (
    <div className="bg-background min-h-screen">
      <Navigation showMarketplaceLinks={true} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
