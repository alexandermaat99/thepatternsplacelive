import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithProfileServer } from '@/lib/auth-helpers-server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadFabricOrder, sendFabricOrderShippedEmail } from '@/lib/fabric-order-server';

/**
 * POST /api/admin/fabric-orders/:id
 * { action: 'shipped', tracking?: string } | { action: 'picked_up' } | { action: 'cancel' }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentUserWithProfileServer();
  if (!auth?.user || !auth.profile?.admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action, tracking } = (await request.json().catch(() => ({}))) as {
    action?: string;
    tracking?: string;
  };
  const service = createServiceRoleClient();

  if (action === 'shipped' || action === 'picked_up') {
    const { data, error } = await service
      .from('fabric_orders')
      .update({
        status: action,
        fulfilled_at: new Date().toISOString(),
        ...(action === 'shipped' && { tracking_number: tracking?.trim() || null }),
      })
      .eq('id', id)
      .eq('status', 'paid')
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'Order is not awaiting fulfillment.' }, { status: 409 });
    const order = await loadFabricOrder(id);
    if (order) await sendFabricOrderShippedEmail(order);
    return NextResponse.json({ ok: true });
  }

  if (action === 'cancel') {
    const { data: released, error } = await service.rpc('release_fabric_order', {
      p_order_id: id,
      p_status: 'cancelled',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!released) return NextResponse.json({ error: 'Order already fulfilled or cancelled.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
