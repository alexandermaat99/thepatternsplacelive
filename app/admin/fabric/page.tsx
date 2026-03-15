import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfileServer } from '@/lib/auth-helpers-server';
import { redirect } from 'next/navigation';
import { FabricInventory } from '@/components/admin/fabric-inventory';

export default async function AdminFabricPage() {
  const authData = await getCurrentUserWithProfileServer();
  if (!authData?.user || !authData.profile?.admin) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: fabric, error } = await supabase
    .from('fabric')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching fabric:', error);
  }

  return (
    <FabricInventory
      initialFabric={fabric ?? []}
      userId={authData.user.id}
    />
  );
}
