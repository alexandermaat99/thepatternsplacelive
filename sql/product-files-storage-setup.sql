-- Supabase Storage Setup for Product Digital Files
-- Run this in your Supabase SQL Editor
-- This creates a private bucket for digital product files that only buyers can access

-- Create a storage bucket for product files (NOT public - only accessible to buyers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product files
-- Only authenticated users who have purchased the product can download files
-- This is enforced through RLS policies that check the orders table

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Sellers can upload their own product files" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can view their own product files" ON storage.objects;
DROP POLICY IF EXISTS "Buyers can download purchased product files" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their own product files" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their own product files" ON storage.objects;

-- Allow sellers to upload files to their own product folders
CREATE POLICY "Sellers can upload their own product files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow sellers to view their own product files
CREATE POLICY "Sellers can view their own product files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow buyers to download files for products they've purchased
-- Note: This policy checks if buyer has purchased from the seller
-- For more granular control, you may need to store product_id in the file path
-- or use a separate mapping table. For now, this allows access to all files
-- from sellers the buyer has purchased from.
CREATE POLICY "Buyers can download purchased product files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-files' 
  AND auth.role() = 'authenticated'
  AND (
    -- Seller can access their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Buyer can access files from sellers they've purchased from
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.buyer_id = auth.uid()
      AND orders.status = 'completed'
      AND orders.seller_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Allow sellers to update their own product files
CREATE POLICY "Sellers can update their own product files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow sellers to delete their own product files
CREATE POLICY "Sellers can delete their own product files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

