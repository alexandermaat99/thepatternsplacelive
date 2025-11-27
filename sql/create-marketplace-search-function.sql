-- Create optimized database function for marketplace search
-- This reduces round trips and improves performance
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT DEFAULT NULL,
  category_slugs TEXT[] DEFAULT NULL,
  difficulty_levels TEXT[] DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'newest',
  limit_count INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  image_url TEXT,
  images TEXT[],
  category TEXT,
  difficulty TEXT,
  user_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  search_words TEXT[];
  product_ids UUID[];
  category_ids UUID[];
BEGIN
  -- Tokenize search query
  IF search_query IS NOT NULL AND search_query != '' THEN
    search_words := string_to_array(lower(trim(search_query)), ' ');
  END IF;

  -- Get category IDs if category slugs provided
  IF category_slugs IS NOT NULL AND array_length(category_slugs, 1) > 0 THEN
    SELECT array_agg(id) INTO category_ids
    FROM categories
    WHERE slug = ANY(category_slugs)
    AND is_active = true;
  END IF;

  -- Build product query
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.currency,
    p.image_url,
    p.images,
    p.category,
    p.difficulty,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    pr.username,
    pr.full_name,
    pr.avatar_url
  FROM products p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  WHERE p.is_active = true
  -- Category filter
  AND (category_ids IS NULL OR p.id IN (
    SELECT product_id 
    FROM product_categories 
    WHERE category_id = ANY(category_ids)
  ))
  -- Difficulty filter
  AND (difficulty_levels IS NULL OR p.difficulty = ANY(difficulty_levels))
  -- Price filter
  AND (min_price IS NULL OR p.price >= min_price)
  AND (max_price IS NULL OR p.price <= max_price)
  -- Search filter (simplified - can be enhanced)
  AND (
    search_query IS NULL 
    OR search_query = ''
    OR (
      p.title ILIKE '%' || search_query || '%'
      OR p.description ILIKE '%' || search_query || '%'
      OR pr.username ILIKE '%' || search_query || '%'
    )
  )
  ORDER BY 
    CASE 
      WHEN sort_by = 'oldest' THEN p.created_at
    END ASC,
    CASE 
      WHEN sort_by = 'newest' THEN p.created_at
    END DESC,
    CASE 
      WHEN sort_by = 'price-low' THEN p.price
    END ASC,
    CASE 
      WHEN sort_by = 'price-high' THEN p.price
    END DESC,
    CASE 
      WHEN sort_by = 'title-asc' THEN p.title
    END ASC,
    CASE 
      WHEN sort_by = 'title-desc' THEN p.title
    END DESC
  LIMIT limit_count;
END;
$$;

-- Create index for faster text search (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_title_description_search 
ON products USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_marketplace_products TO authenticated, anon;

