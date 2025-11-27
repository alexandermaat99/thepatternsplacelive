-- Add Multi-Category System
-- Run this in your Supabase SQL Editor
-- Industry standard: Normalized categories table with many-to-many relationship

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  parent_id uuid,
  icon text, -- Optional: for UI icons
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

-- 2. Create product_categories junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_categories_pkey PRIMARY KEY (product_id, category_id),
  CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories(category_id);

-- 4. Create full-text search index on category name and description
CREATE INDEX IF NOT EXISTS idx_categories_fulltext ON public.categories USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- 5. Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for categories (public read, authenticated users can create)
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view all categories" ON public.categories
  FOR SELECT USING (true);

-- Allow authenticated users to create new categories
CREATE POLICY "Authenticated users can create categories" ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update categories they might have created
-- (You can restrict this further if needed)
CREATE POLICY "Authenticated users can update categories" ON public.categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. RLS Policies for product_categories
CREATE POLICY "Anyone can view product categories" ON public.product_categories
  FOR SELECT USING (true);

CREATE POLICY "Users can insert categories for their own products" ON public.product_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories for their own products" ON public.product_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = auth.uid()
    )
  );

-- 8. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to automatically update updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- 10. Insert seed categories (common pattern categories)
-- You can customize these based on your needs
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Crochet', 'crochet', 'Crochet patterns and designs', 1),
  ('Knitting', 'knitting', 'Knitting patterns and designs', 2),
  ('Sewing', 'sewing', 'Sewing patterns and designs', 3),
  ('Embroidery', 'embroidery', 'Embroidery patterns and designs', 4),
  ('Quilting', 'quilting', 'Quilting patterns and designs', 5),
  ('Amigurumi', 'amigurumi', 'Amigurumi and stuffed toy patterns', 6),
  ('Accessories', 'accessories', 'Patterns for accessories like bags, hats, scarves', 7),
  ('Clothing', 'clothing', 'Clothing patterns for garments', 8),
  ('Home Decor', 'home-decor', 'Home decoration and interior design patterns', 9),
  ('Baby & Kids', 'baby-kids', 'Patterns for babies and children', 10)
ON CONFLICT (slug) DO NOTHING;

-- 11. Migrate existing category data (if any products have categories)
-- This migrates the old single category field to the new many-to-many system
DO $$
DECLARE
  product_record RECORD;
  category_record RECORD;
BEGIN
  -- Loop through products that have a category value
  FOR product_record IN 
    SELECT DISTINCT id, category 
    FROM public.products 
    WHERE category IS NOT NULL AND category != ''
  LOOP
    -- Try to find or create a category for the old category value
    SELECT * INTO category_record 
    FROM public.categories 
    WHERE slug = lower(regexp_replace(product_record.category, '[^a-zA-Z0-9]+', '-', 'g'));
    
    -- If category doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO public.categories (name, slug, description)
      VALUES (
        product_record.category,
        lower(regexp_replace(product_record.category, '[^a-zA-Z0-9]+', '-', 'g')),
        'Migrated category'
      )
      RETURNING * INTO category_record;
    END IF;
    
    -- Link product to category
    INSERT INTO public.product_categories (product_id, category_id)
    VALUES (product_record.id, category_record.id)
    ON CONFLICT (product_id, category_id) DO NOTHING;
  END LOOP;
END $$;

-- 12. Add helpful view for products with categories (optional but useful)
CREATE OR REPLACE VIEW public.products_with_categories AS
SELECT 
  p.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'description', c.description
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) AS categories
FROM public.products p
LEFT JOIN public.product_categories pc ON p.id = pc.product_id
LEFT JOIN public.categories c ON pc.category_id = c.id AND c.is_active = true
GROUP BY p.id;

-- Note: The old 'category' column in products table can be kept for backward compatibility
-- or removed later after confirming migration is complete

