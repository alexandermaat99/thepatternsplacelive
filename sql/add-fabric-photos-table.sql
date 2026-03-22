-- Multiple ordered photos per fabric (keyed by base SKU). Run in Supabase SQL Editor.
-- Requires public.is_admin() from sql/fix-fabric-rls.sql or sql/add-fabric-and-admin.sql

CREATE TABLE IF NOT EXISTS public.fabric_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  base_sku text NOT NULL,
  photo_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT fabric_photos_pkey PRIMARY KEY (id),
  CONSTRAINT fabric_photos_base_sku_sort_unique UNIQUE (base_sku, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_fabric_photos_base_sku ON public.fabric_photos (base_sku);

COMMENT ON TABLE public.fabric_photos IS 'Ordered gallery images for a fabric (same base SKU as parseFabricSku).';

ALTER TABLE public.fabric_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select fabric_photos"
  ON public.fabric_photos FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert fabric_photos"
  ON public.fabric_photos FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update fabric_photos"
  ON public.fabric_photos FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete fabric_photos"
  ON public.fabric_photos FOR DELETE
  USING (public.is_admin());

-- Public catalog reads photos via service role; no anon policy on this table.
