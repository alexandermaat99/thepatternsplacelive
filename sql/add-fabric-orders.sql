-- Online fabric orders + pattern points hardening.
-- Run in the Supabase SQL editor. Safe to run more than once.
-- Requires public.is_admin() (add-fabric-and-admin.sql) and
-- public.protect_privileged_profile_columns() (add-founding-designers.sql).

-- =========================================================================
-- PART A: FABRIC ORDERS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.fabric_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN
    ('pending', 'awaiting_payment', 'paid', 'shipped', 'picked_up', 'cancelled', 'expired')),
  fulfillment text NOT NULL CHECK (fulfillment IN ('ship', 'pickup')),
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  shipping_name text,
  shipping_address jsonb,
  phone text,
  tracking_number text,
  admin_notes text,
  reserved_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  released_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.fabric_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.fabric_orders(id) ON DELETE CASCADE,
  base_sku text NOT NULL,
  name text NOT NULL,
  yards numeric(6, 2) NOT NULL CHECK (yards > 0),
  unit_price_cents integer NOT NULL,          -- price per yard
  line_total_cents integer NOT NULL,
  allocated_sku text                           -- the bolt this cut comes from (set on reserve)
);

CREATE INDEX IF NOT EXISTS idx_fabric_orders_status ON public.fabric_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabric_order_items_order ON public.fabric_order_items (order_id);

ALTER TABLE public.fabric_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_order_items ENABLE ROW LEVEL SECURITY;

-- Customers can see their own orders; admins see and update all.
-- Orders are created only by the server (service role), never from the browser.
DROP POLICY IF EXISTS "View own or admin fabric orders" ON public.fabric_orders;
CREATE POLICY "View own or admin fabric orders" ON public.fabric_orders
  FOR SELECT USING ((select auth.uid()) = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Admins update fabric orders" ON public.fabric_orders;
CREATE POLICY "Admins update fabric orders" ON public.fabric_orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "View own or admin fabric order items" ON public.fabric_order_items;
CREATE POLICY "View own or admin fabric order items" ON public.fabric_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fabric_orders o
      WHERE o.id = fabric_order_items.order_id
        AND ((select auth.uid()) = o.user_id OR public.is_admin())
    )
  );

-- Reserve stock for every item in an order, all-or-nothing.
-- Each cut comes from ONE bolt (a 2 yd cut split across two bolts would be two
-- pieces), choosing the smallest bolt that fits to minimize leftover remnants.
-- Raises INSUFFICIENT_STOCK:<base_sku> if any item can't be filled; the whole
-- transaction then rolls back.
CREATE OR REPLACE FUNCTION public.reserve_fabric_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item record;
  bolt_sku text;
BEGIN
  PERFORM 1 FROM public.fabric_orders WHERE id = p_order_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_PENDING';
  END IF;

  FOR item IN
    SELECT id, base_sku, yards FROM public.fabric_order_items
    WHERE order_id = p_order_id AND allocated_sku IS NULL
  LOOP
    SELECT f.sku INTO bolt_sku
    FROM public.fabric f
    WHERE (
        f.sku = item.base_sku
        OR (length(f.sku) = length(item.base_sku) + 1
            AND left(f.sku, length(item.base_sku)) = item.base_sku
            AND right(f.sku, 1) ~ '^[0-9]$')
      )
      AND f.current_quantity >= item.yards
    ORDER BY f.current_quantity ASC, f.sku
    LIMIT 1
    FOR UPDATE;

    IF bolt_sku IS NULL THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', item.base_sku;
    END IF;

    UPDATE public.fabric SET current_quantity = current_quantity - item.yards WHERE sku = bolt_sku;
    UPDATE public.fabric_order_items SET allocated_sku = bolt_sku WHERE id = item.id;
  END LOOP;

  UPDATE public.fabric_orders
  SET status = 'awaiting_payment', reserved_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Put reserved stock back (checkout expired/abandoned, or admin cancel).
-- Idempotent: returns false if already released or already fulfilled.
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

  UPDATE public.fabric_orders
  SET status = p_status, released_at = now()
  WHERE id = p_order_id;
  RETURN true;
END;
$$;

-- Only the server (service role) may reserve or release stock.
REVOKE ALL ON FUNCTION public.reserve_fabric_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_fabric_order(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_fabric_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_fabric_order(uuid, text) TO service_role;

-- =========================================================================
-- PART B: PATTERN POINTS HARDENING
-- Before points can be spent on fabric, users must not be able to mint them.
-- Today: award_pattern_points() is callable from the browser by anyone (any
-- user id, any amount), and users can set profiles.pattern_points directly.
-- =========================================================================

-- 1. Only the server can call the award function.
REVOKE ALL ON FUNCTION public.award_pattern_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_pattern_points(uuid, integer) TO service_role;

-- 2. Ledger so one-time awards (e.g. "listed a product") can't be repeated.
CREATE TABLE IF NOT EXISTS public.pattern_point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  ref_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, ref_id)
);
ALTER TABLE public.pattern_point_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own point events" ON public.pattern_point_events;
CREATE POLICY "View own point events" ON public.pattern_point_events
  FOR SELECT USING ((select auth.uid()) = user_id OR public.is_admin());

-- Awards points once per (user, reason, ref). Returns the new total, or NULL
-- if this award was already given.
CREATE OR REPLACE FUNCTION public.award_pattern_points_once(
  p_user_id uuid, p_points integer, p_reason text, p_ref_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_total integer;
BEGIN
  INSERT INTO public.pattern_point_events (user_id, points, reason, ref_id)
  VALUES (p_user_id, p_points, p_reason, p_ref_id)
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
  SET pattern_points = COALESCE(pattern_points, 0) + p_points
  WHERE id = p_user_id
  RETURNING pattern_points INTO new_total;
  RETURN new_total;
END;
$$;
REVOKE ALL ON FUNCTION public.award_pattern_points_once(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_pattern_points_once(uuid, integer, text, text) TO service_role;

-- 3. Users can't edit their own point balance from the browser.
--    (Extends the existing privileged-column trigger with pattern_points.)
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.admin := false;
      NEW.completed_sales_count := 0;
      NEW.founding_designer := false;
      NEW.platform_fee_waived_until := NULL;
      NEW.pattern_points := 20; -- the sign-up bonus
    ELSE
      NEW.admin := OLD.admin;
      NEW.completed_sales_count := OLD.completed_sales_count;
      NEW.founding_designer := OLD.founding_designer;
      NEW.platform_fee_waived_until := OLD.platform_fee_waived_until;
      NEW.pattern_points := OLD.pattern_points;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
