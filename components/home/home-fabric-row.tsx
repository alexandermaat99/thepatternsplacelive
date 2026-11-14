import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getFabricCatalogRows } from '@/lib/fabric-catalog';
import { formatCents } from '@/lib/fabric-orders';

/** Curated deadstock fabric in stock now. Hidden if none. */
export async function HomeFabricRow() {
  const rows = (await getFabricCatalogRows())
    .filter(r => (r.current_quantity ?? 0) > 0 && r.sell_price != null)
    .sort((a, b) => Number(!!b.photo_url) - Number(!!a.photo_url))
    .slice(0, 4);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="home-fabric" className="border-b">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-fabric" className="text-2xl sm:text-3xl font-bold">Curated deadstock fabric</h2>
            <p className="text-muted-foreground mt-1">
              Hand-picked, limited yardage. When a bolt is gone, it&apos;s gone. Ships in the US, or pick up in Utah Valley.
            </p>
          </div>
          <Link href="/fabric" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            Shop all fabric <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map(f => (
            <li key={f.sku}>
              <Link href={`/fabric/${encodeURIComponent(f.sku)}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                  {f.photo_url ? (
                    <img
                      src={f.photo_url}
                      alt={f.name ?? f.sku}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="mt-2 truncate text-sm font-medium group-hover:underline">{f.name ?? f.sku}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCents(Math.round(Number(f.sell_price) * 100))}/yd
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
