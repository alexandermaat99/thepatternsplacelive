-- Add files column to products table for digital file URLs
-- Run this in your Supabase SQL Editor

-- Add files column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'files'
  ) THEN
    ALTER TABLE public.products ADD COLUMN files text[];
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN public.products.files IS 'Array of digital file URLs stored in product-files bucket. Only accessible to buyers who have purchased the product.';

