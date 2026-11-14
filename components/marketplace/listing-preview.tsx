'use client';

import { Eye } from 'lucide-react';
import { ProductCard } from '@/components/marketplace/product-card';
import { FabricRequirementsDisplay } from '@/components/marketplace/fabric-requirements-display';
import { normalizeFabricRequirements, type FabricRequirements } from '@/lib/fabric-requirements';
import { getDifficultyLabel } from '@/lib/constants';
import { formatCents } from '@/lib/fabric-orders';

/**
 * Live preview shown next to the sell form: the marketplace card exactly as
 * shoppers will see it, plus the top of the product page.
 */
export function ListingPreview({
  title,
  description,
  price,
  isFree,
  images,
  difficulty,
  categories,
  username,
  fabricRequirements,
}: {
  title: string;
  description: string;
  price: string;
  isFree: boolean;
  images: string[];
  difficulty: string;
  categories: string;
  username: string | null;
  fabricRequirements: FabricRequirements | null;
}) {
  const priceNumber = isFree ? 0 : parseFloat(price) || 0;
  const categoryList = categories
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  const requirements = normalizeFabricRequirements(fabricRequirements);

  const product = {
    id: 'preview',
    title: title.trim() || 'Your pattern title',
    description,
    price: priceNumber,
    currency: 'USD',
    image_url: images[0] ?? undefined,
    images,
    category: categoryList[0] ?? '',
    difficulty: difficulty || null,
    is_free: isFree,
    profiles: username ? { username } : undefined,
    product_categories: categoryList.map(name => ({
      category: { id: name, name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    })),
  };

  return (
    <aside className="space-y-4" aria-label="Listing preview">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Eye className="h-4 w-4" /> Preview: how shoppers will see it
      </p>

      <div className="pointer-events-none select-none max-w-[280px]" aria-hidden="true">
        <ProductCard product={product as never} preview hideFavorite />
      </div>

      <div className="rounded-lg border p-4 space-y-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product page</p>
        <div>
          <p className="text-lg font-semibold leading-snug">{product.title}</p>
          <p className="font-medium text-primary">
            {isFree || priceNumber === 0 ? 'Free' : formatCents(Math.round(priceNumber * 100))}
            {difficulty && <span className="ml-2 font-normal text-muted-foreground">· {getDifficultyLabel(difficulty)}</span>}
          </p>
          {username && <p className="text-muted-foreground">@{username}</p>}
        </div>
        <p className="text-muted-foreground whitespace-pre-line line-clamp-6">
          {description.trim() || 'Your description will appear here.'}
        </p>
        {requirements ? (
          <FabricRequirementsDisplay requirements={requirements} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Tip: add &quot;Fabric needed&quot; so buyers know how much fabric to buy.
          </p>
        )}
      </div>
    </aside>
  );
}
