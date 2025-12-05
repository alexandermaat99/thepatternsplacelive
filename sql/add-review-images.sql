-- Add image support to reviews
-- Run this in your Supabase SQL Editor
-- This allows users to upload images with their product reviews

-- Add images column to reviews table (array of image URLs)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Create index for reviews with images (optional, for filtering)
CREATE INDEX IF NOT EXISTS idx_reviews_has_images ON public.reviews(product_id) 
WHERE array_length(images, 1) > 0;

-- Create storage bucket for review images (if it doesn't exist)
-- We'll use a separate bucket for review images to keep them organized
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for review images
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can view review images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review images" ON storage.objects;

-- Allow public read access to review images
CREATE POLICY "Public can view review images"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

-- Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own review images
CREATE POLICY "Users can update their own review images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'review-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own review images
CREATE POLICY "Users can delete their own review images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'review-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add comment explaining the images column
COMMENT ON COLUMN public.reviews.images IS 'Array of image URLs uploaded with the review. Images are stored in the review-images storage bucket.';
