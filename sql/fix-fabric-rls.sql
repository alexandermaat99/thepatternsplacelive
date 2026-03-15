-- Fix fabric RLS: use SECURITY DEFINER so the policy can read profiles (which has its own RLS).
-- Run this in Supabase SQL Editor if fabric insert/update fails with permission errors.

-- Helper that runs with definer rights so it can read profiles regardless of RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Drop the existing single policy
DROP POLICY IF EXISTS "Admins can do everything on fabric" ON public.fabric;

-- Recreate with explicit policies using is_admin()
CREATE POLICY "Admins can select fabric"
  ON public.fabric FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert fabric"
  ON public.fabric FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update fabric"
  ON public.fabric FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete fabric"
  ON public.fabric FOR DELETE
  USING (public.is_admin());
