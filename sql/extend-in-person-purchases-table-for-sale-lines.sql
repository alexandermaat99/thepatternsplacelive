-- Add per-line snapshots so grouped transactions can be safely reversed.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS sale_lines jsonb;

