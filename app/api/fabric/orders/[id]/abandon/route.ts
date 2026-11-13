import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * POST /api/fabric/orders/:id/abandon
 * Called when a shopper backs out of Stripe checkout. Expires the session and
 * returns the held yardage right away instead of waiting for the 30-minute hold.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();
  const { data: order } = await service
    .from('fabric_orders')
    .select('id, user_id, status, stripe_session_id')
    .eq('id', id)
    .single();
  if (!order || order.status !== 'awaiting_payment') return NextResponse.json({ released: false });

  // Signed-in orders can only be abandoned by their owner.
  if (order.user_id) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (user?.id !== order.user_id) return NextResponse.json({ released: false }, { status: 403 });
  }

  if (order.stripe_session_id) {
    try {
      await getStripe().checkout.sessions.expire(order.stripe_session_id);
    } catch {
      // Already completed or expired: let the webhook decide.
      return NextResponse.json({ released: false });
    }
  }
  const { data: released } = await service.rpc('release_fabric_order', {
    p_order_id: id,
    p_status: 'expired',
  });
  return NextResponse.json({ released: !!released });
}
