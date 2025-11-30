'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
// Price range will use Input fields instead of Slider
import { Filter, X, ChevronDown, Info } from 'lucide-react';
import Link from 'next/link';
import { DIFFICULTY_LEVELS } from '@/lib/constants';
import type { Category } from '@/lib/types/categories';
import { MarketplaceSearch } from './marketplace-search';

interface MarketplaceFiltersProps {
  categories: Category[];
  minPrice: number;
  maxPrice: number;
  hasFilters?: boolean;
  productsCount?: number;
}

export function MarketplaceFilters({
  categories,
  minPrice,
  maxPrice,
  hasFilters = false,
  productsCount = 0,
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filter values from URL (applied filters)
  const appliedCategories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const appliedDifficulties = searchParams.get('difficulty')?.split(',').filter(Boolean) || [];
  const appliedPriceMin = searchParams.get('minPrice')
    ? Number(searchParams.get('minPrice'))
    : minPrice;
  const appliedPriceMax = searchParams.get('maxPrice')
    ? Number(searchParams.get('maxPrice'))
    : maxPrice;
  const appliedSort = searchParams.get('sort') || 'newest';

  // Local state for pending filters (not yet applied)
  const [isOpen, setIsOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState<string[]>(appliedCategories);
  const [localDifficulties, setLocalDifficulties] = useState<string[]>(appliedDifficulties);
  const [localPriceRange, setLocalPriceRange] = useState<number[]>([
    appliedPriceMin,
    appliedPriceMax,
  ]);
  const [localSort, setLocalSort] = useState<string>(appliedSort);

  // Track previous applied values to avoid unnecessary updates
  const prevAppliedRef = useRef({
    categories: JSON.stringify([...appliedCategories].sort()),
    difficulties: JSON.stringify([...appliedDifficulties].sort()),
    priceMin: appliedPriceMin,
    priceMax: appliedPriceMax,
    sort: appliedSort,
  });

  // Sync local state when URL changes (e.g., back button, clear filters)
  useEffect(() => {
    const currentCategories = JSON.stringify([...appliedCategories].sort());
    const currentDifficulties = JSON.stringify([...appliedDifficulties].sort());

    // Only update if values actually changed
    if (prevAppliedRef.current.categories !== currentCategories) {
      setLocalCategories(appliedCategories);
      prevAppliedRef.current.categories = currentCategories;
    }

    if (prevAppliedRef.current.difficulties !== currentDifficulties) {
      setLocalDifficulties(appliedDifficulties);
      prevAppliedRef.current.difficulties = currentDifficulties;
    }

    if (
      prevAppliedRef.current.priceMin !== appliedPriceMin ||
      prevAppliedRef.current.priceMax !== appliedPriceMax
    ) {
      setLocalPriceRange([appliedPriceMin, appliedPriceMax]);
      prevAppliedRef.current.priceMin = appliedPriceMin;
      prevAppliedRef.current.priceMax = appliedPriceMax;
    }

    if (prevAppliedRef.current.sort !== appliedSort) {
      setLocalSort(appliedSort);
      prevAppliedRef.current.sort = appliedSort;
    }
  }, [appliedCategories, appliedDifficulties, appliedPriceMin, appliedPriceMax, appliedSort]);

  // Check if there are pending changes
  const hasPendingChanges =
    JSON.stringify(localCategories.sort()) !== JSON.stringify(appliedCategories.sort()) ||
    JSON.stringify(localDifficulties.sort()) !== JSON.stringify(appliedDifficulties.sort()) ||
    localPriceRange[0] !== appliedPriceMin ||
    localPriceRange[1] !== appliedPriceMax ||
    localSort !== appliedSort;

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Apply categories
    if (localCategories.length > 0) {
      params.set('categories', localCategories.join(','));
    } else {
      params.delete('categories');
    }

    // Apply difficulties
    if (localDifficulties.length > 0) {
      params.set('difficulty', localDifficulties.join(','));
    } else {
      params.delete('difficulty');
    }

    // Apply price range
    if (localPriceRange[0] !== minPrice) {
      params.set('minPrice', localPriceRange[0].toString());
    } else {
      params.delete('minPrice');
    }

    if (localPriceRange[1] !== maxPrice) {
      params.set('maxPrice', localPriceRange[1].toString());
    } else {
      params.delete('maxPrice');
    }

    // Apply sort
    if (localSort !== 'newest') {
      params.set('sort', localSort);
    } else {
      params.delete('sort');
    }

    params.delete('page');
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const handleCategoryToggle = (categorySlug: string) => {
    setLocalCategories(prev =>
      prev.includes(categorySlug) ? prev.filter(c => c !== categorySlug) : [...prev, categorySlug]
    );
  };

  const handleDifficultyToggle = (difficulty: string) => {
    setLocalDifficulties(prev =>
      prev.includes(difficulty) ? prev.filter(d => d !== difficulty) : [...prev, difficulty]
    );
  };

  const handlePriceRangeChange = (index: number, value: number) => {
    setLocalPriceRange(prev => {
      const newRange = [...prev];
      newRange[index] = Math.max(
        minPrice,
        Math.min(maxPrice, value || (index === 0 ? minPrice : maxPrice))
      );
      return newRange;
    });
  };

  const handleSortChange = (sort: string) => {
    setLocalSort(sort);
    // Sort can be applied immediately since it's a single selection
    const params = new URLSearchParams(searchParams.toString());
    if (sort !== 'newest') {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const handleClearFilters = () => {
    // Reset local state to defaults
    setLocalCategories([]);
    setLocalDifficulties([]);
    setLocalPriceRange([minPrice, maxPrice]);
    setLocalSort('newest');

    // Clear URL filters
    const params = new URLSearchParams();
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters =
    appliedCategories.length > 0 ||
    appliedDifficulties.length > 0 ||
    appliedPriceMin !== minPrice ||
    appliedPriceMax !== maxPrice ||
    appliedSort !== 'newest';

  return (
    <div className="space-y-4 lg:space-y-0">
      {/* Mobile filter button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {(hasActiveFilters || hasPendingChanges) && (
              <Badge variant={hasPendingChanges ? 'default' : 'secondary'} className="ml-2">
                {appliedCategories.length +
                  appliedDifficulties.length +
                  (appliedPriceMin !== minPrice || appliedPriceMax !== maxPrice ? 1 : 0) +
                  (appliedSort !== 'newest' ? 1 : 0)}
                {hasPendingChanges && '+'}
              </Badge>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Filter panel */}
      <div
        className={`space-y-6 border rounded-lg bg-card overflow-hidden transition-all duration-300 ease-in-out lg:transition-none ${
          isOpen
            ? 'max-h-[5000px] opacity-100 mt-4 p-6 border'
            : 'max-h-0 opacity-0 mt-0 p-0 border-0'
        } lg:max-h-none lg:opacity-100 lg:mt-0 lg:p-6 lg:border lg:block`}
      >
        {/* Search Bar */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Search</Label>
          <MarketplaceSearch />
          {/* Results Count - Only show when filtering or searching */}
          {hasFilters && productsCount > 0 && (
            <p className="text-sm text-muted-foreground pt-1">
              {productsCount} {productsCount === 1 ? 'pattern' : 'patterns'} found
            </p>
          )}
        </div>

        <div className="border-t pt-6 space-y-6">
          {/* Sort */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Sort by</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {localSort === 'newest' && 'Newest first'}
                  {localSort === 'oldest' && 'Oldest first'}
                  {localSort === 'price-low' && 'Price: Low to High'}
                  {localSort === 'price-high' && 'Price: High to Low'}
                  {localSort === 'title-asc' && 'Title: A to Z'}
                  {localSort === 'title-desc' && 'Title: Z to A'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full">
                <DropdownMenuItem onClick={() => handleSortChange('newest')}>
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('oldest')}>
                  Oldest first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('price-low')}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('price-high')}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('title-asc')}>
                  Title: A to Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('title-desc')}>
                  Title: Z to A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Price Range</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="min-price" className="text-sm text-muted-foreground">
                  Min ($)
                </Label>
                <Input
                  id="min-price"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  value={localPriceRange[0]}
                  onChange={e => {
                    handlePriceRangeChange(0, Number(e.target.value) || minPrice);
                  }}
                  className="mt-1"
                  placeholder={`$${minPrice}`}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="max-price" className="text-sm text-muted-foreground">
                  Max ($)
                </Label>
                <Input
                  id="max-price"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  value={localPriceRange[1]}
                  onChange={e => {
                    handlePriceRangeChange(1, Number(e.target.value) || maxPrice);
                  }}
                  className="mt-1"
                  placeholder={`$${maxPrice}`}
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const isSelected = localCategories.includes(category.slug);
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.slug)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#E8A598] text-white border-2 border-[#E8A598]'
                          : 'bg-background border-2 border-[#383838] text-foreground hover:bg-muted'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-base font-semibold">Difficulty</Label>
              <Link
                href="/marketplace/difficulty-levels"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Learn about difficulty levels"
              >
                <Info className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_LEVELS.map(level => {
                const isSelected = localDifficulties.includes(level.value);
                return (
                  <button
                    key={level.value}
                    onClick={() => handleDifficultyToggle(level.value)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2"
                    style={
                      isSelected
                        ? {
                            backgroundColor: level.color,
                            color: level.textColor,
                            borderColor: level.color,
                          }
                        : {
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            borderColor: '#383838',
                          }
                    }
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="pt-4 border-t space-y-2">
            <Button onClick={applyFilters} className="w-full" disabled={!hasPendingChanges}>
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
