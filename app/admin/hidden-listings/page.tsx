import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { UnhideButton } from '@/components/admin/unhide-button';

export const metadata = { title: 'Hidden listings', robots: { index: false, follow: false } };

type Row = {
  product_id: string;
  reason: string;
  hidden_at: string;
  products: { title: string; profiles: { username: string | null } | null } | null;
};

export default async function HiddenListingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_moderation')
    .select('product_id, reason, hidden_at, products(title, profiles:user_id(username))')
    .order('hidden_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hidden listings</h1>
        <p className="text-muted-foreground mt-1">
          Listings hidden by an admin. The seller still sees them as listed. Everyone else
          (shoppers, other sellers, search engines) can&apos;t see them anywhere. To hide a
          listing, open its product page while signed in as an admin and use &quot;Hide
          listing&quot;.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load hidden listings ({error.message}). If the table doesn&apos;t exist yet,
          run <code>sql/add-product-moderation.sql</code> in Supabase.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hidden listings.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map(row => (
            <div key={row.product_id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
              <div className="flex-1 min-w-0 space-y-1">
                <Link
                  href={`/marketplace/product/${row.product_id}`}
                  className="font-semibold hover:underline"
                >
                  {row.products?.title ?? 'Deleted product'}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {row.products?.profiles?.username ? `@${row.products.profiles.username} · ` : ''}
                  Hidden {new Date(row.hidden_at).toLocaleDateString()}
                </p>
                <p className="text-sm">Reason: {row.reason}</p>
              </div>
              <UnhideButton productId={row.product_id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
