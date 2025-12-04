-- Add reviews table for product reviews
-- Run this in your Supabase SQL Editor
-- This allows users to leave reviews on products they've purchased

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, -- Link to the purchase order
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  difficulty_rating text CHECK (difficulty_rating IS NULL OR difficulty_rating IN ('beginner', 'intermediate', 'advanced', 'expert')),
  title text,
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  -- Ensure one review per product per buyer
  CONSTRAINT reviews_product_buyer_unique UNIQUE (product_id, buyer_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON public.reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

-- Users can only insert reviews for products they've purchased
CREATE POLICY "Users can create reviews for purchased products" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.product_id = reviews.product_id
      AND orders.buyer_id = auth.uid()
      AND orders.status = 'completed'
    )
  );

-- Users can only update their own reviews
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = buyer_id);

-- Users can only delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = buyer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at_trigger ON public.reviews;
CREATE TRIGGER update_reviews_updated_at_trigger
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Create a function to get average rating for a product
CREATE OR REPLACE FUNCTION get_product_rating(p_product_id uuid)
RETURNS TABLE (
  average_rating numeric,
  total_reviews bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating)::numeric(3,2), 0) as average_rating,
    COUNT(*)::bigint as total_reviews
  FROM public.reviews
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_product_rating TO authenticated, anon;

