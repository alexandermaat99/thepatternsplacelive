-- Fabric inventory and admin support
-- Run in Supabase SQL Editor

-- Add admin column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create fabric table
CREATE TABLE IF NOT EXISTS public.fabric (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sku text NOT NULL,
  name text,
  description text,
  weave text,
  width numeric,
  current_quantity numeric,
  purchase_quantity numeric,
  buy_price numeric,
  sell_price numeric,
  photo_url text,
  CONSTRAINT fabric_pkey PRIMARY KEY (sku)
) TABLESPACE pg_default;

-- Add photo_url to fabric if table was created before this column existed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fabric'
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.fabric ADD COLUMN photo_url text;
  END IF;
END $$;

-- Enable RLS on fabric
ALTER TABLE public.fabric ENABLE ROW LEVEL SECURITY;

-- Helper so RLS can check admin without being blocked by profiles' own RLS
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

-- Fabric: only admins can select/insert/update/delete
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

-- Create index for common lookups
CREATE INDEX IF NOT EXISTS idx_fabric_sku ON public.fabric(sku);

-- Storage bucket for fabric photos (public read for display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fabric-photos', 'fabric-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for fabric photos
CREATE POLICY "Public can view fabric photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fabric-photos');

CREATE POLICY "Admins can upload fabric photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fabric-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.admin = true
    )
  );

CREATE POLICY "Admins can update fabric photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fabric-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.admin = true
    )
  );

CREATE POLICY "Admins can delete fabric photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fabric-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.admin = true
    )
  );
