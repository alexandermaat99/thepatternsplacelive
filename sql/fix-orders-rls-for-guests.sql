-- Fix RLS policies for orders table to support guest checkouts
-- Run this in your Supabase SQL Editor
-- This updates the policies to work with both authenticated users and guest checkouts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view orders they bought" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders they sold" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;

-- Updated policy: Authenticated users can view orders they bought
-- For guests, they can't query directly (no auth), but server-side code uses service role
CREATE POLICY "Users can view orders they bought" ON public.orders
  FOR SELECT USING (
    -- Authenticated users can see their orders
    (auth.uid() IS NOT NULL AND auth.uid() = buyer_id)
    -- Note: Guest checkouts (buyer_id IS NULL) are handled server-side via service role client
  );

-- Sellers can always view orders they sold (authenticated only)
CREATE POLICY "Users can view orders they sold" ON public.orders
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND auth.uid() = seller_id
  );

-- Allow inserting orders for authenticated users
-- Guest orders are inserted server-side via service role client (bypasses RLS)
CREATE POLICY "Users can insert orders" ON public.orders
  FOR INSERT WITH CHECK (
    -- Authenticated users can insert their own orders
    (auth.uid() IS NOT NULL AND auth.uid() = buyer_id)
    -- Guest orders are inserted via service role client, so this policy doesn't apply
  );

-- Add comment explaining guest checkout handling
COMMENT ON TABLE public.orders IS 'Orders table supports both authenticated buyers (buyer_id) and guest buyers (buyer_email). Guest checkout operations use service role client to bypass RLS.';
