-- Store aggregate cost and profit per in-person sale (all line items combined).
-- Run in Supabase SQL Editor.

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS cost_amount numeric,
  ADD COLUMN IF NOT EXISTS profit_amount numeric,
  ADD COLUMN IF NOT EXISTS profit_calculation_error text;
