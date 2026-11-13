import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FabricOrderActions } from '@/components/admin/fabric-order-actions';
import { formatCents, formatYardsLabel } from '@/lib/fabric-orders';

export const metadata = { title: 'Fabric orders', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Order = {
  id: string;
  order_number: number;
  created_at: string;
  status: string;
  fulfillment: 'ship' | 'pickup';
  email: string | null;
  phone: string | null;
  total_cents: number;
  shipping_name: string | null;
  shipping_address: Record<string, string | null> | null;
  tracking_number: string | null;
  admin_notes: string | null;
  stripe_payment_intent: string | null;
  fabric_order_items: { base_sku: string; name: string; yards: number; allocated_sku: string | null }[];
};

const GROUPS: { title: string; statuses: string[]; hint?: string }[] = [
  { title: 'To fulfill', statuses: ['paid'], hint: 'Cut each piece from the bolt shown, then mark shipped or picked up.' },
  { title: 'In checkout (stock held)', statuses: ['awaiting_payment'], hint: 'Stock is held until the customer pays or the 30-minute hold expires.' },
  { title: 'Fulfilled', statuses: ['shipped', 'picked_up'] },
  { title: 'Cancelled / expired', statuses: ['cancelled', 'expired'] },
];

export default async function AdminFabricOrdersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fabric_orders')
    .select('id, order_number, created_at, status, fulfillment, email, phone, total_cents, shipping_name, shipping_address, tracking_number, admin_notes, stripe_payment_intent, fabric_order_items(base_sku, name, yards, allocated_sku)')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);
  const orders = (data ?? []) as Order[];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Fabric orders</h1>
        <p className="text-muted-foreground mt-1">
          Online fabric orders. In-person sales are under In-person purchases. Shipping prices and
          pickup details are in <Link href="/admin/fabric-settings" className="underline">Fabric settings</Link>.
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load orders ({error.message}). If the table doesn&apos;t exist yet, run{' '}
          <code>sql/add-fabric-orders.sql</code> in Supabase.
        </p>
      )}
      {GROUPS.map(group => {
        const list = orders.filter(o => group.statuses.includes(o.status));
        if (group.statuses.includes('cancelled') && list.length === 0) return null;
        return (
          <section key={group.title} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {group.title} <span className="text-muted-foreground font-normal">({list.length})</span>
            </h2>
            {group.hint && <p className="text-sm text-muted-foreground">{group.hint}</p>}
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <div className="space-y-3">
                {list.map(o => {
                  const a = o.shipping_address;
                  return (
                    <div key={o.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold">
                          #{o.order_number} ·{' '}
                          <span className={o.fulfillment === 'ship' ? 'text-blue-600' : 'text-amber-600'}>
                            {o.fulfillment === 'ship' ? 'SHIP' : 'PICKUP'}
                          </span>{' '}
                          · {formatCents(o.total_cents)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(o.created_at).toLocaleString()} · {o.status.replace('_', ' ')}
                        </span>
                      </div>
                      {o.admin_notes && (
                        <p className="rounded-md bg-red-50 p-2 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
                          ⚠️ {o.admin_notes}
                        </p>
                      )}
                      <ul className="text-sm space-y-1">
                        {o.fabric_order_items.map(i => (
                          <li key={i.base_sku}>
                            ✂️ <strong>{formatYardsLabel(Number(i.yards))}</strong> of{' '}
                            <Link href={`/fabric/${encodeURIComponent(i.base_sku)}`} className="underline">{i.name}</Link>{' '}
                            <span className="text-muted-foreground">
                              from bolt <span className="font-mono">{i.allocated_sku ?? '?'}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>
                          {o.email ?? 'No email yet'}
                          {o.phone && ` · ${o.phone}`}
                        </div>
                        {o.fulfillment === 'ship' && a && (
                          <div className="whitespace-pre-line">
                            {[o.shipping_name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(', ')]
                              .filter(Boolean)
                              .join('\n')}
                          </div>
                        )}
                        {o.tracking_number && <div>Tracking: {o.tracking_number}</div>}
                        {o.stripe_payment_intent && (
                          <a
                            href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            View payment in Stripe
                          </a>
                        )}
                      </div>
                      <FabricOrderActions
                        orderId={o.id}
                        fulfillment={o.fulfillment}
                        canFulfill={o.status === 'paid'}
                        canCancel={o.status === 'paid' || o.status === 'awaiting_payment'}
                        paid={o.status === 'paid'}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
