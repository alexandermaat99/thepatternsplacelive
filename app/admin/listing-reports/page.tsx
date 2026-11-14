import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingFlagActions } from '@/components/admin/listing-flag-actions';

export const metadata = { title: 'Listing reports', robots: { index: false, follow: false } };

type Row = {
  id: string;
  product_id: string;
  source: 'image_metadata' | 'report';
  reason: string;
  detail: string | null;
  reporter_email: string | null;
  created_at: string;
  products: { title: string; profiles: { username: string | null } | null } | null;
};

const REASON_TO_HIDE_REASON: Record<string, string> = {
  'Looks AI-generated': 'AI-generated pattern',
  'Photo labeled AI-generated in its metadata': 'AI-generated pattern',
  'Copied or stolen design': 'Copyright / not the seller’s to sell',
  'Not a pattern (a service or something else)': 'Service, not a pattern',
  'Misleading or inaccurate': 'Misleading listing',
  'Spam or offensive': 'Spam or low quality',
};

export default async function ListingReportsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: hidden }] = await Promise.all([
    supabase
      .from('listing_flags')
      .select('id, product_id, source, reason, detail, reporter_email, created_at, products(title, profiles:user_id(username))')
      .is('resolved_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('product_moderation').select('product_id'),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const hiddenIds = new Set((hidden ?? []).map(h => h.product_id));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Listing reports</h1>
        <p className="text-muted-foreground mt-1">
          Listings that need a look: reports from shoppers, and photos whose file metadata says
          they were made with AI. Nothing here is hidden automatically. An AI label can also mean an
          AI-edited photo, so check the listing before hiding it.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load reports ({error.message}). If the table doesn&apos;t exist yet, run{' '}
          <code>sql/add-trust-and-fabric-points.sql</code> in Supabase.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to review.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map(row => (
            <div key={row.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.source === 'report'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200'
                    }`}
                  >
                    {row.source === 'report' ? 'Shopper report' : 'Photo metadata'}
                  </span>
                  {hiddenIds.has(row.product_id) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 dark:bg-red-950 dark:text-red-200">
                      Already hidden
                    </span>
                  )}
                </div>
                <Link href={`/marketplace/product/${row.product_id}`} className="font-semibold hover:underline">
                  {row.products?.title ?? 'Deleted product'}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {row.products?.profiles?.username ? `@${row.products.profiles.username} · ` : ''}
                  {new Date(row.created_at).toLocaleString()}
                  {row.source === 'report' && row.reporter_email ? ` · from ${row.reporter_email}` : ''}
                </p>
                <p className="text-sm font-medium">{row.reason}</p>
                {row.detail && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{row.detail}</p>}
              </div>
              <ListingFlagActions
                flagId={row.id}
                productId={row.product_id}
                reason={REASON_TO_HIDE_REASON[row.reason] ?? row.reason}
                alreadyHidden={hiddenIds.has(row.product_id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
