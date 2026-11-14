-- Listing trust tools + spending pattern points on fabric.
-- Run in the Supabase SQL editor. Safe to run more than once.
-- Requires: public.is_admin(), add-fabric-orders.sql (fabric_orders,
-- pattern_point_events, release_fabric_order).

-- =========================================================================
-- PART A: SEWN SAMPLE
-- The seller confirms their photos include a garment sewn from the pattern.
-- =========================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sewn_sample boolean NOT NULL DEFAULT false;

-- =========================================================================
-- PART B: LISTING FLAGS (admin review queue)
-- source = 'image_metadata': an uploaded photo was labeled AI-generated
--          by the tool that made it (IPTC / C2PA). Never auto-hides.
-- source = 'report': a shopper used "Report this listing".
-- Written only by the server (service role). Admins read and resolve.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.listing_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('image_metadata', 'report')),
  reason text NOT NULL,
  detail text,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text
);

CREATE INDEX IF NOT EXISTS listing_flags_open_idx
  ON public.listing_flags (created_at DESC) WHERE resolved_at IS NULL;

-- One open metadata flag per listing, and one open report per signed-in reporter per listing.
CREATE UNIQUE INDEX IF NOT EXISTS listing_flags_one_open_metadata
  ON public.listing_flags (product_id) WHERE source = 'image_metadata' AND resolved_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listing_flags_one_open_report_per_user
  ON public.listing_flags (product_id, reporter_id)
  WHERE source = 'report' AND resolved_at IS NULL AND reporter_id IS NOT NULL;

ALTER TABLE public.listing_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read listing flags" ON public.listing_flags;
CREATE POLICY "Admins read listing flags" ON public.listing_flags
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins resolve listing flags" ON public.listing_flags;
CREATE POLICY "Admins resolve listing flags" ON public.listing_flags
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================================
-- PART C: PATTERN POINTS FOR FABRIC
-- Points are spent when checkout starts (with the stock hold) and refunded
-- if the checkout expires or the order is cancelled.
-- =========================================================================

ALTER TABLE public.fabric_orders
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0;

-- Spend points on a held fabric order. All-or-nothing; raises
-- INSUFFICIENT_POINTS if the balance is too low. Returns the new balance.
CREATE OR REPLACE FUNCTION public.apply_fabric_points(
  p_order_id uuid, p_points integer, p_discount_cents integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o record;
  balance integer;
BEGIN
  IF p_points <= 0 OR p_discount_cents <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS';
  END IF;

  SELECT * INTO o FROM public.fabric_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.user_id IS NULL OR o.status <> 'awaiting_payment' OR o.points_used > 0 THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;
  IF p_discount_cents > o.subtotal_cents THEN
    RAISE EXCEPTION 'INVALID_POINTS';
  END IF;

  SELECT COALESCE(pattern_points, 0) INTO balance
  FROM public.profiles WHERE id = o.user_id FOR UPDATE;
  IF balance < p_points THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;

  INSERT INTO public.pattern_point_events (user_id, points, reason, ref_id)
  VALUES (o.user_id, -p_points, 'fabric_redeem', p_order_id::text);

  UPDATE public.profiles SET pattern_points = balance - p_points WHERE id = o.user_id;

  UPDATE public.fabric_orders
  SET points_used = p_points,
      discount_cents = p_discount_cents,
      total_cents = subtotal_cents - p_discount_cents + shipping_cents
  WHERE id = p_order_id;

  RETURN balance - p_points;
END;
$$;

-- Same as before, plus: refund any points spent on the order (once).
CREATE OR REPLACE FUNCTION public.release_fabric_order(p_order_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o record;
BEGIN
  IF p_status NOT IN ('expired', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO o FROM public.fabric_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.released_at IS NOT NULL OR o.status IN ('shipped', 'picked_up') THEN
    RETURN false;
  END IF;

  UPDATE public.fabric f
  SET current_quantity = f.current_quantity + s.total_yards
  FROM (
    SELECT allocated_sku, SUM(yards) AS total_yards
    FROM public.fabric_order_items
    WHERE order_id = p_order_id AND allocated_sku IS NOT NULL
    GROUP BY allocated_sku
  ) s
  WHERE f.sku = s.allocated_sku;

  IF o.points_used > 0 AND o.user_id IS NOT NULL THEN
    INSERT INTO public.pattern_point_events (user_id, points, reason, ref_id)
    VALUES (o.user_id, o.points_used, 'fabric_redeem_refund', p_order_id::text)
    ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
    IF FOUND THEN
      UPDATE public.profiles
      SET pattern_points = COALESCE(pattern_points, 0) + o.points_used
      WHERE id = o.user_id;
    END IF;
  END IF;

  UPDATE public.fabric_orders
  SET status = p_status, released_at = now()
  WHERE id = p_order_id;
  RETURN true;
END;
$$;

-- Rare race: the hold was released (points refunded) but payment still went
-- through with the discount. Take the points back, up to the current balance.
-- Returns the number of points that could NOT be recovered.
CREATE OR REPLACE FUNCTION public.recharge_fabric_points_after_release(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o record;
  balance integer;
  take integer;
BEGIN
  SELECT * INTO o FROM public.fabric_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.user_id IS NULL OR o.points_used = 0 THEN
    RETURN 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pattern_point_events
    WHERE user_id = o.user_id AND reason = 'fabric_redeem_refund' AND ref_id = p_order_id::text
  ) THEN
    RETURN 0; -- never refunded
  END IF;

  SELECT COALESCE(pattern_points, 0) INTO balance
  FROM public.profiles WHERE id = o.user_id FOR UPDATE;
  take := LEAST(balance, o.points_used);

  INSERT INTO public.pattern_point_events (user_id, points, reason, ref_id)
  VALUES (o.user_id, -take, 'fabric_redeem_recharge', p_order_id::text)
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 0; -- already done
  END IF;
  UPDATE public.profiles SET pattern_points = balance - take WHERE id = o.user_id;
  RETURN o.points_used - take;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_fabric_points(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_fabric_order(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recharge_fabric_points_after_release(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_fabric_points(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_fabric_order(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recharge_fabric_points_after_release(uuid) TO service_role;

-- Check it worked (should return 3 rows):
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND ((table_name = 'products' AND column_name = 'sewn_sample')
--     OR (table_name = 'fabric_orders' AND column_name IN ('discount_cents', 'points_used')));
