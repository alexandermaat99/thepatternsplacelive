-- Performance optimization indexes for marketplace queries
-- Run this in your Supabase SQL Editor to improve query performance

-- Index for active products (most common filter)
CREATE INDEX IF NOT EXISTS idx_products_active_created 
ON products(is_active, created_at DESC) 
WHERE is_active = true;

-- Index for active products by price
CREATE INDEX IF NOT EXISTS idx_products_active_price 
ON products(is_active, price) 
WHERE is_active = true;

-- Index for product categories lookup (for filtering)
CREATE INDEX IF NOT EXISTS idx_product_categories_category 
ON product_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_product 
ON product_categories(product_id);

-- Composite index for category filtering with active products
CREATE INDEX IF NOT EXISTS idx_product_categories_lookup 
ON product_categories(category_id, product_id);

-- Index for category slug lookups (used in filtering)
CREATE INDEX IF NOT EXISTS idx_categories_slug_active 
ON categories(slug, is_active) 
WHERE is_active = true;

-- Index for search queries (title and description)
CREATE INDEX IF NOT EXISTS idx_products_title_search 
ON products USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_products_description_search 
ON products USING gin(to_tsvector('english', description));

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_products_difficulty_active 
ON products(difficulty, is_active) 
WHERE is_active = true AND difficulty IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE products;
ANALYZE categories;
ANALYZE product_categories;

