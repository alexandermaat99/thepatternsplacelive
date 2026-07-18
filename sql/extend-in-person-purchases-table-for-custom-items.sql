-- Allow custom (non-inventory) line items on in-person sales.
-- Custom items use synthetic SKUs like CUSTOM / CUSTOM-1 and are not in public.fabric.
-- Run this in Supabase SQL Editor.

-- 1) Drop FK so top-level sku can be a synthetic custom value
ALTER TABLE public.in_person_purchases
  DROP CONSTRAINT IF EXISTS in_person_purchases_sku_fkey;

-- 2) Ensure name snapshot column exists (used by sale API + admin table)
ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS name text;
