-- Add difficulty level to products table
-- Run this in your Supabase SQL Editor

-- Add difficulty column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Add a check constraint to ensure only valid difficulty levels
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_difficulty_check;

ALTER TABLE public.products
ADD CONSTRAINT products_difficulty_check 
CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Create index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_products_difficulty ON public.products(difficulty) WHERE difficulty IS NOT NULL;

