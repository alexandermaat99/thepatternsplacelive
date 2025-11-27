'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import type { Category } from '@/lib/types/categories';

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categoryIds: string[]) => void;
  maxSelections?: number;
  className?: string;
}

export function CategorySelector({
  selectedCategories,
  onChange,
  maxSelections,
  className = '',
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      // Add category (check max selections)
      if (maxSelections && selectedCategories.length >= maxSelections) {
        return;
      }
      onChange([...selectedCategories, categoryId]);
    }
  };

  const removeCategory = (categoryId: string) => {
    onChange(selectedCategories.filter(id => id !== categoryId));
  };

  const selectedCategoryObjects = categories.filter(cat =>
    selectedCategories.includes(cat.id)
  );

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Label>Categories</Label>
        <div className="text-sm text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Label>Categories</Label>
        {maxSelections && (
          <p className="text-sm text-muted-foreground">
            Select up to {maxSelections} categories ({selectedCategories.length}/{maxSelections} selected)
          </p>
        )}
      </div>

      {/* Selected categories display */}
      {selectedCategoryObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
          {selectedCategoryObjects.map(category => (
            <Badge
              key={category.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {category.name}
              <button
                type="button"
                onClick={() => removeCategory(category.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                aria-label={`Remove ${category.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category list */}
      <div className="h-[200px] overflow-y-auto rounded-md border p-4">
        <div className="space-y-2">
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? 'No categories found' : 'No categories available'}
            </p>
          ) : (
            filteredCategories.map(category => {
              const isSelected = selectedCategories.includes(category.id);
              const isDisabled = maxSelections
                ? !isSelected && selectedCategories.length >= maxSelections
                : false;

              return (
                <div
                  key={category.id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(category.id)}
                    disabled={isDisabled}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className={`flex-1 cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-muted-foreground">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

