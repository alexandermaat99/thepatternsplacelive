-- Track in-person (admin/fabric) purchases and store receipt email + inventory snapshots.
-- Run in Supabase SQL Editor.

-- Ensure we can check admin status in RLS policies.
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

-- Create the purchases table
CREATE TABLE IF NOT EXISTS public.in_person_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  -- Snapshot of what was sold
  sku text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,

  -- Receipt email collected in the admin flow
  receipt_email text NOT NULL,

  -- Who processed the sale (admin user)
  processed_by uuid,

  -- Inventory audit trail
  inventory_before numeric NOT NULL,
  inventory_after numeric NOT NULL,

  -- Email delivery status
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,

  CONSTRAINT in_person_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT in_person_purchases_sku_fkey FOREIGN KEY (sku) REFERENCES public.fabric(sku) ON DELETE RESTRICT,
  CONSTRAINT in_person_purchases_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.in_person_purchases ENABLE ROW LEVEL SECURITY;

-- Admin can view purchases
CREATE POLICY "Admins can select in-person purchases"
  ON public.in_person_purchases FOR SELECT
  USING (public.is_admin());

-- Admin can insert purchases (from /admin/fabric -> /api/fabric/sale)
CREATE POLICY "Admins can insert in-person purchases"
  ON public.in_person_purchases FOR INSERT
  WITH CHECK (public.is_admin());

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_in_person_purchases_created_at
  ON public.in_person_purchases (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_person_purchases_sku
  ON public.in_person_purchases (sku);

CREATE INDEX IF NOT EXISTS idx_in_person_purchases_processed_by
  ON public.in_person_purchases (processed_by);

