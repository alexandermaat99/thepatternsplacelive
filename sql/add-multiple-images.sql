-- Add support for multiple images per product
-- Run this in your Supabase SQL Editor

-- Add images column as JSON array (stores array of image URLs)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- Migrate existing image_url to images array
UPDATE public.products 
SET images = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN jsonb_build_array(image_url)
  ELSE '[]'::jsonb
END
WHERE images = '[]'::jsonb OR images IS NULL;

-- Keep image_url for backward compatibility (can be removed later)
-- For now, we'll use images array as primary, image_url as fallback

