import { getFabricShippingSettings } from '@/lib/fabric-settings-server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { FabricSettingsForm } from '@/components/admin/fabric-settings-form';

export const metadata = { title: 'Fabric settings', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function FabricSettingsPage() {
  const settings = await getFabricShippingSettings();
  const { error } = await createServiceRoleClient().from('site_settings').select('key').limit(1);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fabric settings</h1>
        <p className="text-muted-foreground mt-1">
          Shipping and pickup options for online fabric orders. Changes apply immediately to the
          fabric pages, cart, and checkout.
        </p>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Run <code>sql/add-site-settings.sql</code> in Supabase before saving. Until then the
          defaults below are used.
        </p>
      )}
      <FabricSettingsForm initial={settings} />
    </div>
  );
}
