import { createClient } from '@/lib/supabase/client';

const BUCKET = 'fabric-photos';

/**
 * Upload a fabric image to the public fabric-photos bucket. Client-side only.
 */
export async function uploadFabricImageToStorage(
  file: File,
  userId: string
): Promise<{ publicUrl: string } | { error: string }> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `fabric/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Fabric upload error:', error);
    return { error: 'Failed to upload image.' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { publicUrl };
}
