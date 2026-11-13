import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithProfileServer } from '@/lib/auth-helpers-server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { normalizeShippingSettings } from '@/lib/fabric-orders';
import { FABRIC_SHIPPING_KEY, getFabricShippingSettings } from '@/lib/fabric-settings-server';

export const dynamic = 'force-dynamic';

/** GET: public shipping/pickup options (used by the cart). */
export async function GET() {
  return NextResponse.json(await getFabricShippingSettings());
}

/** PUT: admins update shipping/pickup options. */
export async function PUT(request: NextRequest) {
  const auth = await getCurrentUserWithProfileServer();
  if (!auth?.user || !auth.profile?.admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const settings = normalizeShippingSettings(await request.json().catch(() => null));
  if (!settings.shipping.enabled && !settings.pickup.enabled) {
    return NextResponse.json({ error: 'Turn on at least one of shipping or pickup.' }, { status: 400 });
  }
  const { error } = await createServiceRoleClient()
    .from('site_settings')
    .upsert({ key: FABRIC_SHIPPING_KEY, value: settings, updated_at: new Date().toISOString(), updated_by: auth.user.id });
  if (error) {
    return NextResponse.json(
      { error: error.message.includes('site_settings') ? 'Run sql/add-site-settings.sql in Supabase first.' : error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(settings);
}
