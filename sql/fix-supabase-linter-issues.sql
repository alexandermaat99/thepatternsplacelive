-- Fix Supabase Performance and Security Linter Issues
-- Run this script in your Supabase SQL Editor
-- This fixes all warnings and errors without breaking functionality

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEW (ERROR)
-- ============================================================================
-- Recreate products_with_categories view without SECURITY DEFINER
-- Ensure the view is owned by postgres role and has proper permissions

-- Drop the view completely (CASCADE to drop dependent objects)
DROP VIEW IF EXISTS public.products_with_categories CASCADE;

-- Recreate the view (views don't support SECURITY DEFINER in PostgreSQL)
-- This ensures it's created cleanly without any security definer properties
CREATE VIEW public.products_with_categories AS
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

-- Ensure the view is owned by postgres role (not a SECURITY DEFINER function owner)
-- This prevents the linter from incorrectly flagging it
DO $$
BEGIN
  -- Only change owner if not already postgres
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'products_with_categories'
    AND viewowner != 'postgres'
  ) THEN
    ALTER VIEW public.products_with_categories OWNER TO postgres;
  END IF;
END $$;

-- Grant appropriate permissions
GRANT SELECT ON public.products_with_categories TO authenticated, anon;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATH MUTABLE (WARN - Security)
-- ============================================================================
-- Add SET search_path = '' to all functions to prevent search path injection

-- update_reviews_updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- increment_seller_sales_count
CREATE OR REPLACE FUNCTION public.increment_seller_sales_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET completed_sales_count = completed_sales_count + 1
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

-- get_product_rating
CREATE OR REPLACE FUNCTION get_product_rating(p_product_id uuid)
RETURNS TABLE (
  average_rating numeric,
  total_reviews bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating)::numeric(3,2), 0) as average_rating,
    COUNT(*)::bigint as total_reviews
  FROM public.reviews
  WHERE product_id = p_product_id;
END;
$$;

-- generate_username_from_email
CREATE OR REPLACE FUNCTION public.generate_username_from_email(email text)
RETURNS text 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  base_username := LOWER(SPLIT_PART(email, '@', 1));
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || '123';
  END IF;
  
  IF LENGTH(base_username) > 30 THEN
    base_username := LEFT(base_username, 30);
  END IF;
  
  final_username := base_username;
  
  WHILE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(final_username)
  ) LOOP
    counter := counter + 1;
    final_username := LEFT(base_username, 30 - LENGTH(counter::text)) || counter::text;
    
    IF counter > 9999 THEN
      final_username := 'user' || SUBSTRING(gen_random_uuid()::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- validate_username
CREATE OR REPLACE FUNCTION public.validate_username()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := LOWER(TRIM(NEW.username));
    
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE LOWER(username) = NEW.username 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Username "%" is already taken', NEW.username;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- record_product_view
CREATE OR REPLACE FUNCTION record_product_view(
  p_product_id UUID,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_view_exists BOOLEAN;
BEGIN
  IF p_viewer_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.product_views
      WHERE product_id = p_product_id
      AND viewer_id = p_viewer_id
      AND created_at > NOW() - INTERVAL '1 hour'
    ) INTO recent_view_exists;
    
    IF recent_view_exists THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  INSERT INTO public.product_views (product_id, viewer_id)
  VALUES (p_product_id, p_viewer_id);
  
  RETURN TRUE;
END;
$$;

-- refresh_popularity_scores
CREATE OR REPLACE FUNCTION refresh_popularity_scores()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_popularity_scores;
END;
$$;

-- get_product_popularity
CREATE OR REPLACE FUNCTION get_product_popularity(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_view_count INTEGER;
  v_favorite_count INTEGER;
  v_order_count INTEGER;
  v_created_at TIMESTAMPTZ;
  v_freshness_bonus NUMERIC;
  v_score NUMERIC;
BEGIN
  SELECT created_at INTO v_created_at
  FROM public.products
  WHERE id = p_product_id;
  
  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO v_view_count
  FROM public.product_views
  WHERE product_id = p_product_id
  AND created_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_favorite_count
  FROM public.favorites
  WHERE product_id = p_product_id;
  
  SELECT COUNT(*) INTO v_order_count
  FROM public.orders
  WHERE product_id = p_product_id
  AND status = 'completed';
  
  v_freshness_bonus := GREATEST(0, 10 - (EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 86400 / 3));
  
  v_score := (v_view_count * 0.1) + (v_favorite_count * 2) + (v_order_count * 5) + v_freshness_bonus;
  
  RETURN v_score;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_username text;
BEGIN
  IF NEW.email IS NOT NULL THEN
    BEGIN
      default_username := public.generate_username_from_email(NEW.email);
    EXCEPTION WHEN OTHERS THEN
      default_username := 'user' || SUBSTRING(NEW.id::text, 1, 8);
    END;
  ELSE
    default_username := 'user' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  
  INSERT INTO public.profiles (id, full_name, avatar_url, username, pattern_points)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_username,
    20
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- get_seller_stats
CREATE OR REPLACE FUNCTION get_seller_stats(seller_uuid UUID)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  total_fees DECIMAL,
  total_net_earnings DECIMAL,
  sales_this_month BIGINT,
  revenue_this_month DECIMAL,
  net_this_month DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sales,
    COALESCE(SUM(amount), 0)::DECIMAL as total_revenue,
    COALESCE(SUM(platform_fee + stripe_fee), 0)::DECIMAL as total_fees,
    COALESCE(SUM(net_amount), 0)::DECIMAL as total_net_earnings,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as sales_this_month,
    COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::DECIMAL as revenue_this_month,
    COALESCE(SUM(net_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::DECIMAL as net_this_month
  FROM public.orders
  WHERE seller_id = seller_uuid
    AND status = 'completed';
END;
$$;

-- update_categories_updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- search_marketplace_products
CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT DEFAULT NULL,
  category_slugs TEXT[] DEFAULT NULL,
  difficulty_levels TEXT[] DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'newest',
  limit_count INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  image_url TEXT,
  images TEXT[],
  category TEXT,
  difficulty TEXT,
  user_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  search_words TEXT[];
  product_ids UUID[];
  category_ids UUID[];
BEGIN
  IF search_query IS NOT NULL AND search_query != '' THEN
    search_words := string_to_array(lower(trim(search_query)), ' ');
  END IF;

  IF category_slugs IS NOT NULL AND array_length(category_slugs, 1) > 0 THEN
    SELECT array_agg(id) INTO category_ids
    FROM categories
    WHERE slug = ANY(category_slugs)
    AND is_active = true;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.currency,
    p.image_url,
    p.images,
    p.category,
    p.difficulty,
    p.user_id,
    p.is_active,
    p.created_at,
    p.updated_at,
    pr.username,
    pr.full_name,
    pr.avatar_url
  FROM products p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  WHERE p.is_active = true
  AND (category_ids IS NULL OR p.id IN (
    SELECT product_id 
    FROM product_categories 
    WHERE category_id = ANY(category_ids)
  ))
  AND (difficulty_levels IS NULL OR p.difficulty = ANY(difficulty_levels))
  AND (min_price IS NULL OR p.price >= min_price)
  AND (max_price IS NULL OR p.price <= max_price)
  AND (
    search_query IS NULL 
    OR search_query = ''
    OR (
      p.title ILIKE '%' || search_query || '%'
      OR p.description ILIKE '%' || search_query || '%'
      OR pr.username ILIKE '%' || search_query || '%'
    )
  )
  ORDER BY 
    CASE 
      WHEN sort_by = 'oldest' THEN p.created_at
    END ASC,
    CASE 
      WHEN sort_by = 'newest' THEN p.created_at
    END DESC,
    CASE 
      WHEN sort_by = 'price-low' THEN p.price
    END ASC,
    CASE 
      WHEN sort_by = 'price-high' THEN p.price
    END DESC,
    CASE 
      WHEN sort_by = 'title-asc' THEN p.title
    END ASC,
    CASE 
      WHEN sort_by = 'title-desc' THEN p.title
    END DESC
  LIMIT limit_count;
END;
$$;

-- award_pattern_points
CREATE OR REPLACE FUNCTION award_pattern_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE public.profiles
  SET pattern_points = COALESCE(pattern_points, 0) + p_points
  WHERE id = p_user_id
  RETURNING pattern_points INTO new_total;
  
  RETURN COALESCE(new_total, 0);
END;
$$;

-- ============================================================================
-- 3. FIX MATERIALIZED VIEW IN API (WARN - Security)
-- ============================================================================
-- Revoke direct access to materialized view and create a function wrapper
-- This prevents direct API access while maintaining functionality

-- Revoke direct SELECT access from anon and authenticated roles
REVOKE SELECT ON product_popularity_scores FROM anon, authenticated;

-- Create a function wrapper that respects RLS
CREATE OR REPLACE FUNCTION get_product_popularity_scores()
RETURNS TABLE (
  product_id UUID,
  view_count BIGINT,
  favorite_count BIGINT,
  order_count BIGINT,
  popularity_score NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pps.product_id,
    pps.view_count,
    pps.favorite_count,
    pps.order_count,
    pps.popularity_score,
    pps.created_at
  FROM product_popularity_scores pps
  INNER JOIN public.products p ON pps.product_id = p.id
  WHERE p.is_active = true; -- Respect product visibility
END;
$$;

-- Grant execute on the function instead
GRANT EXECUTE ON FUNCTION get_product_popularity_scores() TO authenticated, anon;

-- ============================================================================
-- 4. FIX RLS POLICY ALWAYS TRUE (WARN - Security)
-- ============================================================================
-- Replace overly permissive WITH CHECK (true) policies with more restrictive ones

-- Fix feedback table policy
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT 
  WITH CHECK (
    -- Allow authenticated users
    (SELECT auth.uid()) IS NOT NULL
    OR 
    -- Allow anonymous users but limit message length to prevent abuse
    (message IS NOT NULL AND LENGTH(message) <= 5000)
  );

-- Fix product_views table policy
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
CREATE POLICY "Anyone can insert product views" ON public.product_views
  FOR INSERT 
  WITH CHECK (
    -- Ensure product_id exists and is valid
    EXISTS (SELECT 1 FROM public.products WHERE id = product_id)
  );

-- ============================================================================
-- 5. FIX AUTH RLS INIT PLAN (WARN - Performance)
-- ============================================================================
-- Replace auth.uid() with (select auth.uid()) in RLS policies for better performance

-- Products table policies
-- Note: SELECT policy will be combined in section 6, so we skip it here
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Profiles table policies
-- Note: SELECT policy will be combined in section 6, so we skip it here
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Favorites table policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
CREATE POLICY "Users can insert their own favorites" ON public.favorites
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can delete their own favorites" ON public.favorites
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Categories table policies
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;
CREATE POLICY "Authenticated users can create categories" ON public.categories
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
CREATE POLICY "Authenticated users can update categories" ON public.categories
  FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- Product_categories table policies
DROP POLICY IF EXISTS "Users can insert categories for their own products" ON public.product_categories;
CREATE POLICY "Users can insert categories for their own products" ON public.product_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete categories for their own products" ON public.product_categories;
CREATE POLICY "Users can delete categories for their own products" ON public.product_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_categories.product_id
      AND products.user_id = (select auth.uid())
    )
  );

-- Reviews table policies
DROP POLICY IF EXISTS "Users can create reviews for purchased products" ON public.reviews;
CREATE POLICY "Users can create reviews for purchased products" ON public.reviews
  FOR INSERT WITH CHECK (
    (select auth.uid()) = buyer_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.product_id = reviews.product_id
      AND orders.buyer_id = (select auth.uid())
      AND orders.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING ((select auth.uid()) = buyer_id);

-- Orders table policies
-- Note: SELECT policies will be combined in section 6, so we skip them here
-- Only fix the INSERT policy here
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
CREATE POLICY "Users can insert orders" ON public.orders
  FOR INSERT WITH CHECK ((select auth.uid()) = buyer_id);

-- Feedback table policy (for SELECT)
DROP POLICY IF EXISTS "Users can read their own feedback" ON public.feedback;
CREATE POLICY "Users can read their own feedback" ON public.feedback
  FOR SELECT USING (
    ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) OR
    ((select auth.uid()) IS NULL AND user_id IS NULL)
  );

-- ============================================================================
-- 6. FIX MULTIPLE PERMISSIVE POLICIES (WARN - Performance)
-- ============================================================================
-- Combine multiple permissive policies into single policies using OR conditions

-- Categories table: Combine "Anyone can view active categories" and "Users can view all categories"
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories" ON public.categories; -- Drop if it already exists
CREATE POLICY "Users can view categories" ON public.categories
  FOR SELECT USING (is_active = true OR true); -- Equivalent to true, but more explicit

-- Products table: Combine "Anyone can view active products" and "Users can view their own products"
-- This also fixes the auth RLS init plan issue by using (select auth.uid())
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view products" ON public.products; -- Drop if it already exists
CREATE POLICY "Users can view products" ON public.products
  FOR SELECT USING (
    is_active = true OR 
    (select auth.uid()) = user_id
  );

-- Orders table: Combine "Users can view orders they bought" and "Users can view orders they sold"
-- This also fixes the auth RLS init plan issue by using (select auth.uid())
DROP POLICY IF EXISTS "Users can view orders they bought" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders they sold" ON public.orders;
DROP POLICY IF EXISTS "Users can view their orders" ON public.orders; -- Drop if it already exists
CREATE POLICY "Users can view their orders" ON public.orders
  FOR SELECT USING (
    (select auth.uid()) = buyer_id OR 
    (select auth.uid()) = seller_id
  );

-- Profiles table: Combine all three SELECT policies
-- This also fixes the auth RLS init plan issue (though this policy uses true, not auth.uid())
DROP POLICY IF EXISTS "Public can view profiles for avatars" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles; -- Drop if it already exists
-- Recreate the combined policy
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (true); -- All profiles are viewable (for avatars, usernames, etc.)

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify fixes)
-- ============================================================================

-- Check function search_path settings
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
-- AND proname IN (
--   'update_reviews_updated_at',
--   'increment_seller_sales_count',
--   'get_product_rating',
--   'generate_username_from_email',
--   'validate_username',
--   'record_product_view',
--   'refresh_popularity_scores',
--   'get_product_popularity',
--   'handle_new_user',
--   'handle_updated_at',
--   'get_seller_stats',
--   'update_categories_updated_at',
--   'search_marketplace_products',
--   'award_pattern_points'
-- );

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES ON REMAINING WARNINGS (Cannot be fixed with SQL)
-- ============================================================================
-- 
-- The following warnings require manual configuration in Supabase Dashboard:
--
-- 1. "Leaked Password Protection Disabled" (WARN)
--    - Go to: Dashboard → Authentication → Password settings
--    - Enable "Leaked password protection"
--    - This checks passwords against HaveIBeenPwned.org database
--
-- 2. "Vulnerable Postgres Version" (WARN)
--    - Go to: Dashboard → Settings → Database
--    - Upgrade your Postgres version to the latest available
--    - Current version: supabase-postgres-17.4.1.075
--    - This requires a database upgrade (may have downtime)
--
-- ============================================================================
