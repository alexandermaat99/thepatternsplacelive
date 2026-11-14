import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';
import { alertAdmin } from '@/lib/admin-alert';
import { COMPANY_INFO } from '@/lib/company-info';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/listings/image-flags  { productId, images: [{ fileName, labels }] }
 * Sent by the sell/edit forms when an uploaded photo carries an AI-generated
 * label in its metadata. Puts the listing in the admin review queue; it does
 * not hide anything.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`image-flags:${getClientIdentifier(request)}`, RATE_LIMITS.STRICT);
  if (!limit.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    productId?: unknown;
    images?: { fileName?: unknown; labels?: unknown }[];
  };
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const images = (Array.isArray(body.images) ? body.images : [])
    .slice(0, 20)
    .map(i => ({
      fileName: typeof i.fileName === 'string' ? i.fileName.slice(0, 200) : 'image',
      labels: Array.isArray(i.labels) ? i.labels.filter((l): l is string => typeof l === 'string').slice(0, 5) : [],
    }))
    .filter(i => i.labels.length > 0);
  if (!UUID.test(productId) || images.length === 0) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: product } = await supabase
    .from('products')
    .select('id, title, user_id')
    .eq('id', productId)
    .maybeSingle();
  if (!product || product.user_id !== user.id) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const detail = images.map(i => `${i.fileName}: ${i.labels.join('; ')}`).join('\n');
  const { error } = await createServiceRoleClient().from('listing_flags').insert({
    product_id: productId,
    source: 'image_metadata',
    reason: 'Photo labeled AI-generated in its metadata',
    detail,
    reporter_id: user.id,
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true }); // already in the queue
    console.error('Error saving image flag:', error);
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }

  await alertAdmin(
    'Listing flagged: AI label in photo metadata',
    `A photo on "${product.title}" carries an AI-generated label in its file metadata. This can also mean an AI-edited photo, so please take a look.\n\n${detail}\n\nListing: ${COMPANY_INFO.urls.website}/marketplace/product/${productId}\nReview queue: ${COMPANY_INFO.urls.website}/admin/listing-reports`
  );
  return NextResponse.json({ ok: true });
}
