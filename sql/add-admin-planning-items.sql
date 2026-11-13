-- Admin-only planning lists (designer outreach, open/public-domain patterns).
-- The data lives only in the database, never in this (public) repo.
-- Run in the Supabase SQL editor. Safe to run more than once.
-- Requires public.is_admin() (see add-fabric-and-admin.sql).

CREATE TABLE IF NOT EXISTS public.admin_planning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list text NOT NULL CHECK (list IN ('designers', 'open_patterns')),
  section text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  subtitle text,            -- what they make / what the pattern is
  url text,                 -- shop, website, or source link
  handle text,              -- e.g. Instagram handle
  detail text,              -- size signal / license
  notes text,               -- research notes: why a good fit, what to mention
  is_priority boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'todo',
  admin_notes text,         -- your own notes (outreach replies, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list, title)
);

CREATE INDEX IF NOT EXISTS idx_admin_planning_items_list
  ON public.admin_planning_items (list, sort_order);

ALTER TABLE public.admin_planning_items ENABLE ROW LEVEL SECURITY;

-- Admins only, for every operation. No policy for anyone else = no access.
DROP POLICY IF EXISTS "Admins manage planning items" ON public.admin_planning_items;
CREATE POLICY "Admins manage planning items" ON public.admin_planning_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_admin_planning_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_admin_planning_item ON public.admin_planning_items;
CREATE TRIGGER touch_admin_planning_item
  BEFORE UPDATE ON public.admin_planning_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_planning_item();
