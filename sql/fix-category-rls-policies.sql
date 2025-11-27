-- Fix Category RLS Policies
-- Run this if categories are not being created/linked properly
-- This ensures all necessary permissions are in place

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can manage categories for their own products" ON product_categories;
DROP POLICY IF EXISTS "Users can insert categories for their own products" ON product_categories;
DROP POLICY IF EXISTS "Users can delete categories for their own products" ON product_categories;

-- Re-create category policies
CREATE POLICY "Authenticated users can create categories" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Re-create product_categories policies with explicit permissions
CREATE POLICY "Users can insert categories for their own products" ON product_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories for their own products" ON product_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('categories', 'product_categories')
ORDER BY tablename, policyname;

