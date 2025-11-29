-- Script to fix products that have categories in the old 'category' field
-- but are missing entries in the product_categories junction table

-- WARNING: Review the results before running the INSERT statements!

-- 1. First, see which products need fixing
SELECT 
  p.id,
  p.title,
  p.category as old_category_field,
  p.is_active,
  CASE 
    WHEN pc.product_id IS NOT NULL THEN 'Has link'
    ELSE 'MISSING LINK'
  END as status
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.category IS NOT NULL 
  AND p.category != ''
  AND pc.product_id IS NULL
  AND p.is_active = true
ORDER BY p.created_at DESC;

-- 2. Find matching categories by name (case-insensitive)
-- This helps identify which category_id to use
SELECT 
  p.id as product_id,
  p.title,
  p.category as old_category_field,
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.is_active as category_is_active
FROM products p
LEFT JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category))
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.category IS NOT NULL 
  AND p.category != ''
  AND pc.product_id IS NULL
  AND p.is_active = true
  AND c.id IS NOT NULL
  AND c.is_active = true
ORDER BY p.created_at DESC;

-- 3. Generate INSERT statements to fix missing links
-- UNCOMMENT AND RUN AFTER REVIEWING THE RESULTS ABOVE
/*
INSERT INTO product_categories (product_id, category_id)
SELECT DISTINCT
  p.id as product_id,
  c.id as category_id
FROM products p
JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category))
LEFT JOIN product_categories pc ON p.id = pc.product_id AND pc.category_id = c.id
WHERE p.category IS NOT NULL 
  AND p.category != ''
  AND pc.product_id IS NULL  -- Only insert if link doesn't exist
  AND p.is_active = true
  AND c.is_active = true
ON CONFLICT (product_id, category_id) DO NOTHING;
*/

-- 4. For the specific product mentioned, check and fix if needed
-- Replace 'womens' with the actual category name/slug if different
SELECT 
  p.id,
  p.title,
  p.category as old_category_field,
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug
FROM products p
LEFT JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category)) 
  OR LOWER(TRIM(c.slug)) = LOWER(TRIM(p.category))
LEFT JOIN product_categories pc ON p.id = pc.product_id AND pc.category_id = c.id
WHERE p.id = '9a9328a3-0952-4d95-b5b9-c864949472fb'
  AND c.id IS NOT NULL
  AND pc.product_id IS NULL;

-- If the above query returns a row, you can fix it with:
/*
INSERT INTO product_categories (product_id, category_id)
SELECT 
  p.id,
  c.id
FROM products p
JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category)) 
  OR LOWER(TRIM(c.slug)) = LOWER(TRIM(p.category))
WHERE p.id = '9a9328a3-0952-4d95-b5b9-c864949472fb'
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_categories pc 
    WHERE pc.product_id = p.id AND pc.category_id = c.id
  )
ON CONFLICT (product_id, category_id) DO NOTHING;
*/

