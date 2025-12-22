'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDifficultyLabel } from '@/lib/constants';
import type { Category } from '@/lib/types/categories';

interface ActiveFiltersProps {
  categories: Category[];
}

export function ActiveFilters({ categories }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCategories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const selectedDifficulties = searchParams.get('difficulty')?.split(',').filter(Boolean) || [];
  const priceMin = searchParams.get('minPrice');
  const priceMax = searchParams.get('maxPrice');
  const sortBy = searchParams.get('sort');

  const removeFilter = (type: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (type === 'category' && value) {
      const newCategories = selectedCategories.filter(c => c !== value);
      if (newCategories.length > 0) {
        params.set('categories', newCategories.join(','));
      } else {
        params.delete('categories');
      }
    } else if (type === 'difficulty' && value) {
      const newDifficulties = selectedDifficulties.filter(d => d !== value);
      if (newDifficulties.length > 0) {
        params.set('difficulty', newDifficulties.join(','));
      } else {
        params.delete('difficulty');
      }
    } else if (type === 'minPrice') {
      params.delete('minPrice');
    } else if (type === 'maxPrice') {
      params.delete('maxPrice');
    } else if (type === 'sort') {
      params.delete('sort');
    }

    params.delete('page');
    const queryString = params.toString();
    router.push(queryString ? `/marketplace?${queryString}` : '/marketplace', { scroll: false });
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    // Keep search query if exists
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    const queryString = params.toString();
    router.push(queryString ? `/marketplace?${queryString}` : '/marketplace', { scroll: false });
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedDifficulties.length +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (sortBy && sortBy !== 'popular' ? 1 : 0);

  if (activeFiltersCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {/* Category filters */}
      {selectedCategories.map(categorySlug => {
        const category = categories.find(c => c.slug === categorySlug);
        return (
          <Badge
            key={`category-${categorySlug}`}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {category?.name || categorySlug}
            <button
              onClick={() => removeFilter('category', categorySlug)}
              className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              aria-label={`Remove ${category?.name || categorySlug} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      {/* Difficulty filters */}
      {selectedDifficulties.map(difficulty => (
        <Badge
          key={`difficulty-${difficulty}`}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          {getDifficultyLabel(difficulty)}
          <button
            onClick={() => removeFilter('difficulty', difficulty)}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label={`Remove ${difficulty} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Price filters */}
      {priceMin && (
        <Badge variant="secondary" className="flex items-center gap-1 pr-1">
          Min: ${priceMin}
          <button
            onClick={() => removeFilter('minPrice')}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label="Remove minimum price filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {priceMax && (
        <Badge variant="secondary" className="flex items-center gap-1 pr-1">
          Max: ${priceMax}
          <button
            onClick={() => removeFilter('maxPrice')}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label="Remove maximum price filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Sort filter */}
      {sortBy && sortBy !== 'popular' && (
        <Badge variant="secondary" className="flex items-center gap-1 pr-1">
          Sort: {sortBy === 'oldest' && 'Oldest first'}
          {sortBy === 'newest' && 'Newest first'}
          {sortBy === 'price-low' && 'Price: Low to High'}
          {sortBy === 'price-high' && 'Price: High to Low'}
          {sortBy === 'title-asc' && 'Title: A to Z'}
          {sortBy === 'title-desc' && 'Title: Z to A'}
          <button
            onClick={() => removeFilter('sort')}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label="Remove sort filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}
