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

  const initialFabricPhotosByBase: Record<string, string[]> = {};
  const { data: photoRows, error: photosError } = await supabase
    .from('fabric_photos')
    .select('base_sku, photo_url, sort_order')
    .order('base_sku', { ascending: true })
    .order('sort_order', { ascending: true });

  if (photosError) {
    console.error('Error fetching fabric_photos:', photosError);
  } else {
    for (const r of photoRows ?? []) {
      if (!initialFabricPhotosByBase[r.base_sku]) {
        initialFabricPhotosByBase[r.base_sku] = [];
      }
      initialFabricPhotosByBase[r.base_sku].push(r.photo_url);
    }
  }

  return (
    <FabricInventory
      initialFabric={fabric ?? []}
      initialFabricPhotosByBase={initialFabricPhotosByBase}
      userId={authData.user.id}
    />
  );
}
