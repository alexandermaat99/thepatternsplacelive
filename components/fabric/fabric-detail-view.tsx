import Link from 'next/link';
import { ArrowLeft, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FabricPublicDetail } from '@/lib/fabric-catalog';
import { FabricDetailCarousel } from '@/components/fabric/fabric-detail-carousel';

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

function formatWidth(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}"`;
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

export function FabricDetailView({ fabric }: { fabric: FabricPublicDetail }) {
  const title = fabric.name?.trim() || 'Unnamed fabric';
  const imageAlt = `${title} — SKU ${fabric.sku}`;
  const galleryUrls = fabric.photo_urls.filter((u): u is string => isPublicImageUrl(u));

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link href="/fabric">
          <ArrowLeft className="h-4 w-4" />
          All fabric
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
        {galleryUrls.length > 0 ? (
          <FabricDetailCarousel urls={galleryUrls} alt={imageAlt} />
        ) : (
          <div className="relative aspect-[4/5] w-full max-w-xl mx-auto lg:mx-0 rounded-lg border border-border bg-muted overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Ruler className="h-12 w-12 opacity-40" aria-hidden />
              <span className="text-sm">Photo coming soon</span>
            </div>
          </div>
        )}

        <div className="space-y-6 min-w-0">
          <header className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
            <p className="font-mono text-sm text-muted-foreground break-all">
              {fabric.boltCount > 1 ? 'Base SKU ' : 'SKU '}
              {fabric.sku}
              {fabric.boltCount > 1 ? (
                <span className="block text-xs font-sans text-muted-foreground mt-1">
                  {fabric.boltCount} bolts — totals below include all bolts.
                </span>
              ) : null}
            </p>
          </header>

          <dl className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-4 gap-y-3 text-sm sm:text-base border-y border-border py-6">
            <dt className="text-muted-foreground">Price / yd</dt>
            <dd className="font-semibold tabular-nums">{formatPrice(fabric.sell_price)}</dd>
            <dt className="text-muted-foreground">Total yards left</dt>
            <dd className="tabular-nums">{formatYards(fabric.current_quantity)}</dd>
            <dt className="text-muted-foreground">Width</dt>
            <dd className="tabular-nums">{formatWidth(fabric.width)}</dd>
            <dt className="text-muted-foreground">Fiber</dt>
            <dd>{fabric.fiber?.trim() || '—'}</dd>
            <dt className="text-muted-foreground">Weave</dt>
            <dd>{fabric.weave?.trim() || '—'}</dd>
          </dl>

          {fabric.bolts.length > 1 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Yardage by bolt</h2>
              <ul className="rounded-md border border-border divide-y divide-border text-sm">
                {fabric.bolts.map(b => (
                  <li key={b.sku} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                    <span className="text-muted-foreground">
                      {b.label}{' '}
                      <span className="font-mono text-foreground/90">({b.sku})</span>
                    </span>
                    <span className="tabular-nums font-medium">{formatYards(b.current_quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
