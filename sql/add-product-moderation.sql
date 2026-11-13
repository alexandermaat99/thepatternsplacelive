-- Admin "shadow hide" for product listings.
--
-- A hidden listing stays visible to its seller (it looks normal to them),
-- to admins, and to people who already bought it (for their purchases page).
-- Everyone else, including search engines, can't see it anywhere: marketplace,
-- search, product page, seller page, homepage, sitemap, or checkout.
--
-- The hide flag and reason live in a separate admin-only table, so the seller
-- can't discover them even by querying the API directly.
--
-- Run in the Supabase SQL editor. Safe to run more than once.
-- Requires public.is_admin() (see add-fabric-and-admin.sql).

-- 1. Moderation records (one row = hidden)
CREATE TABLE IF NOT EXISTS public.product_moderation (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product moderation" ON public.product_moderation;
CREATE POLICY "Admins manage product moderation" ON public.product_moderation
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Lookup that works regardless of who is asking (RLS on the table above
--    would otherwise hide the record from the very policy that needs it).
CREATE OR REPLACE FUNCTION public.is_product_hidden(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.product_moderation WHERE product_id = p_product_id
  );
$$;

-- 3. Who can see a product. Drop every known SELECT policy name first:
--    Postgres ORs permissive policies together, so a leftover
--    "Anyone can view active products" policy would leak hidden listings.
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view products" ON public.products;
CREATE POLICY "Users can view products" ON public.products
  FOR SELECT USING (
    -- Everyone: active and not hidden
    (is_active = true AND NOT public.is_product_hidden(id))
    -- The seller always sees their own listings, hidden or not
    OR (select auth.uid()) = user_id
    -- Admins see everything
    OR public.is_admin()
    -- Past buyers keep seeing what they bought (purchases page)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.product_id = products.id AND o.buyer_id = (select auth.uid())
    )
  );

-- 4. Check: this should list exactly one SELECT policy on products,
--    "Users can view products". If you see others, tell your developer.
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'products' AND cmd = 'SELECT';
