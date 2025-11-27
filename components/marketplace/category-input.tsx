'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Category } from '@/lib/types/categories';

interface CategoryInputProps {
  value: string; // Comma-separated category names
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Helper function to create slug from category name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Helper function to find or create a category
 */
async function findOrCreateCategory(name: string): Promise<Category | null> {
  const supabase = createClient();
  const trimmedName = name.trim().toLowerCase(); // Auto-lowercase category names
  const slug = createSlug(trimmedName);

  if (!trimmedName) return null;

  // First, try to find existing category by slug
  const { data: existingBySlug, error: slugError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (existingBySlug) {
    return existingBySlug;
  }

  // Also try by name (case-insensitive) - exact match first
  const { data: existingByName, error: nameError } = await supabase
    .from('categories')
    .select('*')
    .ilike('name', trimmedName)
    .limit(1)
    .maybeSingle();

  if (existingByName && !nameError) {
    return existingByName;
  }

  // If not found, create a new category
  console.log(`Creating new category: ${trimmedName} (slug: ${slug})`);
  
  const { data: newCategory, error: insertError } = await supabase
    .from('categories')
    .insert({
      name: trimmedName,
      slug: slug,
      is_active: true,
      display_order: 999, // New categories go to the end
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating category:', insertError);
    console.error('Category details:', { name: trimmedName, slug, error: insertError });
    
    // If creation fails due to unique constraint (category already exists), try finding it again
    if (insertError.code === '23505') { // Unique violation
      const { data: retryFind } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (retryFind) {
        console.log('Found existing category after unique violation:', retryFind);
        return retryFind;
      }
    }
    
    // If still not found, throw error so it can be handled by caller
    throw new Error(`Failed to create category "${trimmedName}": ${insertError.message}`);
  }

  console.log('Successfully created category:', newCategory);
  return newCategory;
}

export function CategoryInput({
  value,
  onChange,
  className = '',
  placeholder = 'Enter categories separated by commas (e.g., Crochet, Knitting, Accessories)',
}: CategoryInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [parsedCategories, setParsedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Parse comma-separated categories
  useEffect(() => {
    if (value) {
      const categories = value
        .split(',')
        .map(cat => cat.trim().toLowerCase()) // Auto-lowercase when parsing
        .filter(cat => cat.length > 0);
      setParsedCategories(categories);
    } else {
      setParsedCategories([]);
    }
  }, [value]);

  // Fetch category suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue || inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const supabase = createClient();
        const searchTerm = inputValue.toLowerCase();
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(10)
          .order('display_order')
          .order('name');

        setSuggestions(data || []);
      } catch (error) {
        console.error('Error fetching category suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // When user finishes typing (on comma or blur), we'll lowercase in the parsing
    onChange(newValue);
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    const categories = parsedCategories.filter(cat => cat !== categoryToRemove.toLowerCase());
    onChange(categories.join(', '));
  };

  const handleSuggestionClick = (category: Category) => {
    const categories = [...parsedCategories];
    const categoryNameLower = category.name.toLowerCase();
    if (!categories.includes(categoryNameLower)) {
      categories.push(categoryNameLower);
      onChange(categories.join(', '));
      setInputValue('');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="categories">Categories</Label>
        <p className="text-sm text-muted-foreground">
          Enter category names separated by commas. New categories will be created automatically.
        </p>
      </div>

      {/* Display parsed categories as badges */}
      {parsedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
          {parsedCategories.map((category, index) => (
            <Badge
              key={`${category}-${index}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {category}
              <button
                type="button"
                onClick={() => handleRemoveCategory(category)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                aria-label={`Remove ${category}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          id="categories"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLoading}
        />
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && inputValue && (
        <div className="border rounded-md bg-background shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2 space-y-1">
            <div className="text-xs text-muted-foreground px-2 py-1">Suggestions:</div>
            {suggestions
              .filter(cat => !parsedCategories.includes(cat.name))
              .map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSuggestionClick(category)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{category.name}</div>
                  {category.description && (
                    <div className="text-xs text-muted-foreground">{category.description}</div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to process comma-separated categories and link them to a product
 * Call this after creating/updating a product
 */
export async function linkCategoriesToProduct(
  productId: string,
  categoryNames: string
): Promise<void> {
  if (!categoryNames || !categoryNames.trim()) {
    return;
  }

  const supabase = createClient();
  const categoryNameArray = categoryNames
    .split(',')
    .map(name => name.trim().toLowerCase()) // Auto-lowercase category names
    .filter(name => name.length > 0);

  if (categoryNameArray.length === 0) {
    return;
  }

  console.log('Linking categories to product:', { productId, categoryNames: categoryNameArray });

  // Find or create categories one by one to handle errors better
  const validCategories: Category[] = [];
  
  for (const categoryName of categoryNameArray) {
    try {
      const category = await findOrCreateCategory(categoryName);
      if (category) {
        validCategories.push(category);
        console.log('Found/created category:', category.name, category.id);
      } else {
        console.warn(`Failed to find or create category: ${categoryName}`);
      }
    } catch (error) {
      console.error(`Error processing category "${categoryName}":`, error);
      // Continue with other categories even if one fails
    }
  }

  if (validCategories.length === 0) {
    console.warn('No valid categories could be created or found for:', categoryNameArray);
    throw new Error('Failed to create or find any categories. Please check the console for details.');
  }

  // Remove existing category links for this product
  const { error: deleteError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    console.error('Error removing old category links:', deleteError);
    // Continue anyway - might be first time linking
  }

  // Create new category links
  const categoryLinks = validCategories.map(category => ({
    product_id: productId,
    category_id: category.id,
  }));

  console.log('Inserting category links:', categoryLinks);

  const { error: insertError, data } = await supabase
    .from('product_categories')
    .insert(categoryLinks)
    .select();

  if (insertError) {
    console.error('Error linking categories to product:', insertError);
    console.error('Category links attempted:', categoryLinks);
    throw new Error(`Failed to link categories: ${insertError.message}`);
  }

  console.log('Successfully linked categories:', data);
}

