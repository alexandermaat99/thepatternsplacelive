import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';
import { REPORT_REASONS, type ReportReason } from '@/lib/listing-flags';
import { alertAdmin } from '@/lib/admin-alert';
import { COMPANY_INFO } from '@/lib/company-info';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/listings/report  { productId, reason, detail?, email? }
 * "Report this listing". Anyone can report (signed in or not); reports go to
 * the admin review queue. Nothing is hidden automatically.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`report:${getClientIdentifier(request)}`, RATE_LIMITS.STRICT);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many reports. Please try again later.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const reason = body.reason as ReportReason;
  const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 2000) : '';
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
  if (!UUID.test(productId) || !REPORT_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Please choose a reason.' }, { status: 400 });
  }
  if (reason === 'Something else' && !detail) {
    return NextResponse.json({ error: 'Please tell us what’s wrong.' }, { status: 400 });
  }
  if (email && !EMAIL.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email, or leave it blank.' }, { status: 400 });
  }

  // Only listings the reporter can actually see (RLS).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: product } = await supabase
    .from('products')
    .select('id, title, user_id')
    .eq('id', productId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (user && user.id === product.user_id) {
    return NextResponse.json({ error: 'You can’t report your own listing.' }, { status: 400 });
  }

  const { error } = await createServiceRoleClient().from('listing_flags').insert({
    product_id: productId,
    source: 'report',
    reason,
    detail: detail || null,
    reporter_id: user?.id ?? null,
    reporter_email: user?.email ?? (email || null),
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true }); // already reported by this user
    console.error('Error saving listing report:', error);
    return NextResponse.json({ error: 'Could not send your report. Please try again.' }, { status: 500 });
  }

  await alertAdmin(
    `Listing reported: ${reason}`,
    `"${product.title}" was reported.\n\nReason: ${reason}${detail ? `\nDetails: ${detail}` : ''}\nReporter: ${user?.email ?? (email || 'anonymous')}\n\nListing: ${COMPANY_INFO.urls.website}/marketplace/product/${productId}\nReview queue: ${COMPANY_INFO.urls.website}/admin/listing-reports`
  );
  return NextResponse.json({ ok: true });
}
