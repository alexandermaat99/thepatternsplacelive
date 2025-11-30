-- Add product views tracking for popularity algorithm
-- Run this in your Supabase SQL Editor

-- Create product_views table to track clicks/views
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous views
  ip_hash TEXT, -- Hashed IP for anonymous deduplication (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON public.product_views(created_at);
CREATE INDEX IF NOT EXISTS idx_product_views_viewer_id ON public.product_views(viewer_id);

-- Create a composite index for counting views per product efficiently
CREATE INDEX IF NOT EXISTS idx_product_views_product_created 
ON public.product_views(product_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can insert product views" ON public.product_views
  FOR INSERT WITH CHECK (true);

-- Only allow reading aggregate data, not individual view records
-- (We'll use a function to get counts instead of direct reads)
CREATE POLICY "No direct read access to views" ON public.product_views
  FOR SELECT USING (false);

-- Create a function to record a product view (with rate limiting)
CREATE OR REPLACE FUNCTION record_product_view(
  p_product_id UUID,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_view_exists BOOLEAN;
BEGIN
  -- Rate limit: Check if this user/session viewed this product in the last hour
  IF p_viewer_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.product_views
      WHERE product_id = p_product_id
      AND viewer_id = p_viewer_id
      AND created_at > NOW() - INTERVAL '1 hour'
    ) INTO recent_view_exists;
    
    IF recent_view_exists THEN
      RETURN FALSE; -- Already viewed recently, don't count again
    END IF;
  END IF;
  
  -- Insert the view
  INSERT INTO public.product_views (product_id, viewer_id)
  VALUES (p_product_id, p_viewer_id);
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_product_view TO authenticated, anon;

-- Create a materialized view for product popularity scores (optional, for performance)
-- This can be refreshed periodically via a cron job
CREATE MATERIALIZED VIEW IF NOT EXISTS product_popularity_scores AS
SELECT 
  p.id as product_id,
  COALESCE(view_counts.view_count, 0) as view_count,
  COALESCE(fav_counts.favorite_count, 0) as favorite_count,
  COALESCE(order_counts.order_count, 0) as order_count,
  -- Popularity score formula:
  -- views × 0.1 + favorites × 2 + purchases × 5 + freshness_bonus
  (
    COALESCE(view_counts.view_count, 0) * 0.1 +
    COALESCE(fav_counts.favorite_count, 0) * 2 +
    COALESCE(order_counts.order_count, 0) * 5 +
    -- Freshness bonus: 10 points for products < 7 days old, decaying to 0 over 30 days
    GREATEST(0, 10 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 / 3) )
  ) as popularity_score,
  p.created_at
FROM public.products p
LEFT JOIN (
  SELECT product_id, COUNT(*) as view_count
  FROM public.product_views
  WHERE created_at > NOW() - INTERVAL '30 days' -- Only count recent views
  GROUP BY product_id
) view_counts ON p.id = view_counts.product_id
LEFT JOIN (
  SELECT product_id, COUNT(*) as favorite_count
  FROM public.favorites
  GROUP BY product_id
) fav_counts ON p.id = fav_counts.product_id
LEFT JOIN (
  SELECT product_id, COUNT(*) as order_count
  FROM public.orders
  WHERE status = 'completed'
  GROUP BY product_id
) order_counts ON p.id = order_counts.product_id
WHERE p.is_active = true;

-- Create unique index on materialized view for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_popularity_product_id 
ON product_popularity_scores(product_id);

-- Create index on popularity score for fast sorting
CREATE INDEX IF NOT EXISTS idx_product_popularity_score 
ON product_popularity_scores(popularity_score DESC);

-- Function to refresh popularity scores (call this via cron, e.g., every 15 minutes)
CREATE OR REPLACE FUNCTION refresh_popularity_scores()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_popularity_scores;
END;
$$;

-- Grant execute permission for refresh (admin only in production)
GRANT EXECUTE ON FUNCTION refresh_popularity_scores TO authenticated;

-- Alternative: Real-time popularity calculation function (no materialized view needed)
-- Use this if you want always-fresh data without cron jobs
CREATE OR REPLACE FUNCTION get_product_popularity(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_view_count INTEGER;
  v_favorite_count INTEGER;
  v_order_count INTEGER;
  v_created_at TIMESTAMPTZ;
  v_freshness_bonus NUMERIC;
  v_score NUMERIC;
BEGIN
  -- Get product creation date
  SELECT created_at INTO v_created_at
  FROM public.products
  WHERE id = p_product_id;
  
  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count views (last 30 days)
  SELECT COUNT(*) INTO v_view_count
  FROM public.product_views
  WHERE product_id = p_product_id
  AND created_at > NOW() - INTERVAL '30 days';
  
  -- Count favorites
  SELECT COUNT(*) INTO v_favorite_count
  FROM public.favorites
  WHERE product_id = p_product_id;
  
  -- Count completed orders
  SELECT COUNT(*) INTO v_order_count
  FROM public.orders
  WHERE product_id = p_product_id
  AND status = 'completed';
  
  -- Calculate freshness bonus (10 points at 0 days, 0 at 30 days)
  v_freshness_bonus := GREATEST(0, 10 - (EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 86400 / 3));
  
  -- Calculate score
  v_score := (v_view_count * 0.1) + (v_favorite_count * 2) + (v_order_count * 5) + v_freshness_bonus;
  
  RETURN v_score;
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_popularity TO authenticated, anon;

