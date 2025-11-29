'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MarketplacePaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: {
    q?: string;
    categories?: string;
    difficulty?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  };
}

export function MarketplacePagination({
  currentPage,
  totalPages,
  searchParams,
}: MarketplacePaginationProps) {
  const router = useRouter();

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    
    if (searchParams.q) params.set('q', searchParams.q);
    if (searchParams.categories) params.set('categories', searchParams.categories);
    if (searchParams.difficulty) params.set('difficulty', searchParams.difficulty);
    if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
    if (searchParams.sort) params.set('sort', searchParams.sort);
    
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    return `/marketplace?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(buildUrl(page), { scroll: false });
  };

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages: (number | string)[] = [];
    
    // Always show first page
    if (currentPage > delta + 2) {
      pages.push(1);
      if (currentPage > delta + 3) {
        pages.push('...');
      }
    }
    
    // Show pages around current page
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      pages.push(i);
    }
    
    // Always show last page
    if (currentPage < totalPages - delta - 1) {
      if (currentPage < totalPages - delta - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="min-w-[2.5rem]"
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  );
}

