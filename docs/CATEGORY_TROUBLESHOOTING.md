# Category System Troubleshooting

## Common Issues and Solutions

### Issue: Categories don't save when creating/editing products

#### 1. Check RLS Policies
Make sure you've run the SQL migration (`sql/add-categories-system.sql`) which sets up:
- Categories table
- Product_categories junction table
- RLS policies for authenticated users to create categories

#### 2. Check Browser Console
Open browser DevTools (F12) and check the Console tab for errors:
- Look for "Error creating category"
- Look for "Error linking categories to product"
- Check for RLS policy violations

#### 3. Verify Database Tables Exist
Run in Supabase SQL Editor:
```sql
SELECT * FROM categories LIMIT 5;
SELECT * FROM product_categories LIMIT 5;
```

#### 4. Check RLS Policies are Active
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'product_categories');

-- Should return rowsecurity = true for both
```

#### 5. Test Category Creation Manually
Try creating a category directly in Supabase:
```sql
INSERT INTO categories (name, slug, is_active) 
VALUES ('Test Category', 'test-category', true);
```

If this fails, check:
- RLS policies are blocking INSERT
- User has proper authentication

#### 6. Check Product Ownership
Categories can only be linked to products you own. Verify:
- You're logged in
- The product.user_id matches your auth.uid()

#### 7. Enable Debug Logging
The code includes console.log statements. Check browser console for:
- "Linking categories to product"
- "Found/created category"
- "Successfully linked categories"

## Fixing RLS Policy Issues

If categories aren't being created, you may need to update RLS policies:

```sql
-- Allow all authenticated users to create categories
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
CREATE POLICY "Authenticated users can create categories" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to insert product_category links for their products
DROP POLICY IF EXISTS "Users can insert categories for their own products" ON product_categories;
CREATE POLICY "Users can insert categories for their own products" ON product_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_categories.product_id
      AND products.user_id = auth.uid()
    )
  );
```

## Testing Category Linking

After creating a product, verify categories were linked:

```sql
-- Check categories for a specific product
SELECT 
  p.title,
  c.name as category_name,
  c.slug
FROM products p
JOIN product_categories pc ON p.id = pc.product_id
JOIN categories c ON pc.category_id = c.id
WHERE p.id = 'your-product-id-here';
```

