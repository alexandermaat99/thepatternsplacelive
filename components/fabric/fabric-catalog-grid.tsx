import Image from 'next/image';
import Link from 'next/link';
import { Ruler } from 'lucide-react';
import type { FabricCatalogRow } from '@/lib/fabric-catalog';

function formatPrice(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatYards(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} yd`;
}

function isPublicImageUrl(url: string | null): url is string {
  if (!url || url.length > 2048) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function FabricCatalogGrid({ rows }: { rows: FabricCatalogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16">
        No fabric listings are available right now. Check back soon.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 list-none p-0 m-0">
      {rows.map((row, index) => {
        const showImage = isPublicImageUrl(row.photo_url);
        // Few eager images keep LCP tight; remaining images lazy-load in the viewport.
        const priority = index < 4;
        const label = row.name?.trim() || 'Fabric';
        const imageAlt = `${label} — SKU ${row.sku}`;

        const href = `/fabric/${encodeURIComponent(row.sku)}`;

        return (
          <li key={row.sku} className="[content-visibility:auto] [contain-intrinsic-size:320px]">
            <Link
              href={href}
              className="block h-full rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              aria-label={`View details for ${label}, SKU ${row.sku}`}
            >
              <div className="relative aspect-[4/5] w-full bg-muted">
                {showImage ? (
                  <Image
                    src={row.photo_url!}
                    alt={imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                    priority={priority}
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Ruler className="h-10 w-10 opacity-40" aria-hidden />
                    <span className="text-xs">Photo coming soon</span>
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                <h2 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem]">
                  {row.name?.trim() || 'Unnamed fabric'}
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-mono text-xs sm:text-sm break-all">{row.sku}</dd>
                  {row.boltCount > 1 ? (
                    <>
                      <dt className="text-muted-foreground">Bolts</dt>
                      <dd className="tabular-nums">{row.boltCount}</dd>
                    </>
                  ) : null}
                  <dt className="text-muted-foreground">Price / yd</dt>
                  <dd className="font-medium tabular-nums">{formatPrice(row.sell_price)}</dd>
                  <dt className="text-muted-foreground">Yards left</dt>
                  <dd className="tabular-nums">{formatYards(row.current_quantity)}</dd>
                </dl>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
