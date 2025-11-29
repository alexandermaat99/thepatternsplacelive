-- Fix script to link products with "womens" in old category field to the womens category
-- Based on the CSV data showing products with "womens" in comma-separated category field

-- 1. First, verify the "womens" category exists and get its ID
SELECT 
  id,
  name,
  slug,
  is_active
FROM categories
WHERE LOWER(slug) = 'womens' OR LOWER(name) = 'womens';

-- 2. Check which products need to be linked (products with "womens" in old category field but no link)
SELECT 
  p.id,
  p.title,
  p.category as old_category_field,
  c.id as womens_category_id,
  c.name as category_name,
  CASE 
    WHEN pc.product_id IS NOT NULL THEN 'Already linked'
    ELSE 'Needs link'
  END as status
FROM products p
CROSS JOIN categories c
LEFT JOIN product_categories pc ON p.id = pc.product_id AND pc.category_id = c.id
WHERE LOWER(p.category) LIKE '%womens%'
  AND LOWER(c.slug) = 'womens'
  AND c.is_active = true
  AND p.is_active = true
  AND pc.product_id IS NULL
ORDER BY p.created_at DESC;

-- 3. INSERT the missing links
-- This will link all products that have "womens" in their old category field
-- to the "womens" category in the product_categories junction table
INSERT INTO product_categories (product_id, category_id)
SELECT DISTINCT
  p.id as product_id,
  c.id as category_id
FROM products p
CROSS JOIN categories c
LEFT JOIN product_categories pc ON p.id = pc.product_id AND pc.category_id = c.id
WHERE LOWER(p.category) LIKE '%womens%'
  AND LOWER(c.slug) = 'womens'
  AND c.is_active = true
  AND p.is_active = true
  AND pc.product_id IS NULL  -- Only insert if link doesn't already exist
ON CONFLICT (product_id, category_id) DO NOTHING;

-- 4. Verify the fix worked
SELECT 
  p.id,
  p.title,
  c.name as category_name,
  c.slug as category_slug,
  pc.created_at as linked_at
FROM products p
JOIN product_categories pc ON p.id = pc.product_id
JOIN categories c ON pc.category_id = c.id
WHERE LOWER(c.slug) = 'womens'
  AND LOWER(p.category) LIKE '%womens%'
ORDER BY pc.created_at DESC
LIMIT 10;

-- 5. Count how many products are now linked to "womens"
SELECT 
  COUNT(DISTINCT pc.product_id) as total_products_linked_to_womens
FROM product_categories pc
JOIN categories c ON pc.category_id = c.id
WHERE LOWER(c.slug) = 'womens'
  AND c.is_active = true;

