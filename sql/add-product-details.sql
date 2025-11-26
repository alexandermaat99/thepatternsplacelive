-- Add details field to products table
-- Run this in your Supabase SQL Editor

-- Add details column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS details text;

-- Add comment to details column
COMMENT ON COLUMN public.products.details IS 'Additional product details and specifications (collapsible section on product page)';

