'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketplaceSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  // Update local state when URL changes externally (e.g., back button)
  useEffect(() => {
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }

    params.delete('page');
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => {
    setSearchQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    const queryString = params.toString();
    router.push(queryString ? `/marketplace?${queryString}` : '/marketplace', { scroll: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasPendingSearch = searchQuery.trim() !== urlQuery.trim();

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="text"
        placeholder="Search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-24 h-10 text-sm"
      />
      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 w-7 p-0 hover:bg-transparent"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          onClick={handleSearch}
          disabled={!hasPendingSearch && !searchQuery.trim()}
          size="sm"
          className="h-7 text-xs px-2"
        >
          Search
        </Button>
      </div>
    </div>
  );
}
