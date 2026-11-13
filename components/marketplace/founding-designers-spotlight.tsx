import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FoundingDesignerBadge } from '@/components/marketplace/founding-designer-badge';

const MAX_DESIGNERS = 8;

/**
 * Homepage section featuring Founding Designers who have at least one active
 * listing. Renders nothing until there is at least one.
 */
export async function FoundingDesignersSpotlight() {
  const supabase = await createClient();

  const { data: designers, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, products!inner(id)')
    .eq('founding_designer', true)
    .eq('products.is_active', true)
    .not('username', 'is', null)
    .limit(MAX_DESIGNERS);

  if (error) {
    console.error('Error loading founding designers:', error);
    return null;
  }
  if (!designers?.length) return null;

  return (
    <section aria-labelledby="founding-designers-heading" className="border-b">
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h2 id="founding-designers-heading" className="text-2xl sm:text-3xl font-bold">
            Meet our Founding Designers
          </h2>
          <p className="text-muted-foreground mt-1">
            The independent designers who helped launch The Pattern&apos;s Place.
          </p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {designers.map(designer => {
            const name = designer.full_name || `@${designer.username}`;
            return (
              <li key={designer.id}>
                <Link
                  href={`/marketplace/seller/${encodeURIComponent(designer.username!)}`}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  {designer.avatar_url ? (
                    <img
                      src={designer.avatar_url}
                      alt={name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-rose-500 text-xl font-bold text-white">
                      {name.replace('@', '').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium leading-tight">{name}</span>
                  {designer.full_name && (
                    <span className="text-xs text-muted-foreground">@{designer.username}</span>
                  )}
                  <FoundingDesignerBadge />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
