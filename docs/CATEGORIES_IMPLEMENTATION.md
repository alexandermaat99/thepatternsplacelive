# Multi-Category System Implementation

## Overview
This implementation adds a professional, industry-standard multi-category system to the marketplace, allowing products to have multiple categories for better searchability and filtering.

## Database Schema

### Tables Created

1. **`categories`** - Stores category information
   - `id` (uuid, primary key)
   - `name` (text) - Display name
   - `slug` (text, unique) - URL-friendly identifier
   - `description` (text, optional)
   - `parent_id` (uuid, optional) - For hierarchical categories
   - `icon` (text, optional) - For UI icons
   - `display_order` (integer) - Sorting order
   - `is_active` (boolean) - Enable/disable categories
   - Timestamps

2. **`product_categories`** - Junction table (many-to-many)
   - `product_id` (uuid)
   - `category_id` (uuid)
   - Composite primary key
   - Cascade delete on product/category deletion

### Indexes Created
- Categories: `parent_id`, `slug`, `is_active`
- Product categories: `product_id`, `category_id`
- Full-text search index on category names and descriptions

### RLS Policies
- Public read access for active categories
- Users can manage categories for their own products

## SQL Migration

Run `sql/add-categories-system.sql` in your Supabase SQL Editor. This will:
1. Create the tables and indexes
2. Set up RLS policies
3. Insert seed categories
4. Migrate existing single category data
5. Create a helpful view: `products_with_categories`

## Usage

### 1. Fetching Categories

```typescript
const supabase = createClient();
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true)
  .order('display_order');
```

### 2. Fetching Products with Categories

```typescript
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    product_categories(
      category:categories(*)
    )
  `)
  .eq('is_active', true);
```

### 3. Adding Categories to a Product

```typescript
// First, insert the product
const { data: product } = await supabase
  .from('products')
  .insert({ ...productData })
  .select()
  .single();

// Then, link categories
const categoryLinks = selectedCategoryIds.map(categoryId => ({
  product_id: product.id,
  category_id: categoryId
}));

await supabase
  .from('product_categories')
  .insert(categoryLinks);
```

### 4. Filtering Products by Category

```typescript
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    product_categories(
      category:categories(*)
    )
  `)
  .eq('is_active', true)
  .in('product_categories.category_id', [categoryId1, categoryId2]);
```

## Components

### CategorySelector
A reusable component for selecting multiple categories:
- Search functionality
- Checkbox-based selection
- Max selections limit
- Shows selected categories as badges

**Usage:**
```tsx
<CategorySelector
  selectedCategories={selectedCategoryIds}
  onChange={setSelectedCategoryIds}
  maxSelections={5}
/>
```

## Migration Notes

- The old `category` column in `products` table is preserved for backward compatibility
- Existing category data is automatically migrated
- You can remove the old column later after confirming everything works

## Next Steps

1. Run the SQL migration
2. Update product forms to use `CategorySelector`
3. Update product queries to include categories
4. Add category filtering to marketplace page
5. Update TypeScript interfaces

