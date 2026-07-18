-- Allow custom (non-inventory) line items on in-person sales.
-- Custom items use synthetic SKUs like CUSTOM-1 and are not in public.fabric.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.in_person_purchases
  DROP CONSTRAINT IF EXISTS in_person_purchases_sku_fkey;
