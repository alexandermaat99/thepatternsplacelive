-- Debug script for category filtering issues
-- Product ID: 9a9328a3-0952-4d95-b5b9-c864949472fb

-- 1. Check the product details
SELECT 
  id,
  title,
  category as old_category_field,
  is_active,
  user_id
FROM products
WHERE id = '9a9328a3-0952-4d95-b5b9-c864949472fb';

-- 2. Check what categories are linked to this product in product_categories
SELECT 
  pc.product_id,
  pc.category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.is_active as category_is_active
FROM product_categories pc
JOIN categories c ON pc.category_id = c.id
WHERE pc.product_id = '9a9328a3-0952-4d95-b5b9-c864949472fb';

-- 3. Check if "womens" category exists and its details
SELECT 
  id,
  name,
  slug,
  is_active,
  display_order
FROM categories
WHERE LOWER(name) = 'womens' OR LOWER(slug) = 'womens';

-- 4. Check all categories that contain "womens" (case-insensitive)
SELECT 
  id,
  name,
  slug,
  is_active
FROM categories
WHERE LOWER(name) LIKE '%womens%' OR LOWER(slug) LIKE '%womens%';

-- 5. Check all products that should show when filtering by "womens" category
-- First, get the category ID for "womens"
WITH womens_category AS (
  SELECT id, name, slug
  FROM categories
  WHERE LOWER(slug) = 'womens' AND is_active = true
)
SELECT 
  p.id,
  p.title,
  p.is_active as product_is_active,
  pc.category_id,
  c.name as category_name,
  c.slug as category_slug
FROM products p
JOIN product_categories pc ON p.id = pc.product_id
JOIN categories c ON pc.category_id = c.id
CROSS JOIN womens_category wc
WHERE pc.category_id = wc.id
  AND p.is_active = true
ORDER BY p.created_at DESC;

-- 6. Check if the specific product should appear in the filter
WITH womens_category AS (
  SELECT id
  FROM categories
  WHERE LOWER(slug) = 'womens' AND is_active = true
)
SELECT 
  p.id,
  p.title,
  p.is_active as product_is_active,
  CASE 
    WHEN pc.product_id IS NOT NULL AND pc.category_id IN (SELECT id FROM womens_category) THEN 'YES - Linked via product_categories'
    ELSE 'NO - Not linked'
  END as linked_status,
  p.category as old_category_field
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.id = '9a9328a3-0952-4d95-b5b9-c864949472fb';

-- 7. Check for any products with "womens" in the old category field but not linked
SELECT 
  p.id,
  p.title,
  p.category as old_category_field,
  p.is_active,
  CASE 
    WHEN pc.product_id IS NOT NULL THEN 'Has product_categories link'
    ELSE 'MISSING product_categories link'
  END as link_status
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE LOWER(p.category) LIKE '%womens%'
  AND pc.product_id IS NULL;

-- 8. Count products per category to see distribution
SELECT 
  c.name,
  c.slug,
  c.is_active,
  COUNT(pc.product_id) as product_count
FROM categories c
LEFT JOIN product_categories pc ON c.id = pc.category_id
LEFT JOIN products p ON pc.product_id = p.id AND p.is_active = true
GROUP BY c.id, c.name, c.slug, c.is_active
ORDER BY product_count DESC, c.name;

-- 9. Simulate the exact filtering logic used in the marketplace page
-- This matches what the code does: convert slug to lowercase and filter
WITH category_filter AS (
  SELECT id
  FROM categories
  WHERE LOWER(slug) = LOWER('womens')  -- This is what the code does: .map(s => s.toLowerCase())
    AND is_active = true
),
product_ids AS (
  SELECT DISTINCT product_id
  FROM product_categories
  WHERE category_id IN (SELECT id FROM category_filter)
)
SELECT 
  p.id,
  p.title,
  p.is_active,
  CASE 
    WHEN p.id IN (SELECT product_id FROM product_ids) THEN 'SHOULD APPEAR'
    ELSE 'WILL NOT APPEAR'
  END as filter_result
FROM products p
WHERE p.id = '9a9328a3-0952-4d95-b5b9-c864949472fb';

-- 10. Check for slug mismatches (common issue)
SELECT 
  c.id,
  c.name,
  c.slug,
  LOWER(c.slug) as lower_slug,
  c.is_active,
  CASE 
    WHEN c.slug != LOWER(c.slug) THEN 'HAS UPPERCASE - MAY CAUSE ISSUES'
    ELSE 'OK'
  END as slug_warning
FROM categories c
WHERE LOWER(c.name) LIKE '%womens%' OR LOWER(c.slug) LIKE '%womens%';

