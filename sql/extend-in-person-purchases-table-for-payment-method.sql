-- Add payment method to in-person purchases.
-- Run in Supabase SQL Editor.

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Optional: constrain to known values (allows NULL for older rows).
ALTER TABLE public.in_person_purchases
  DROP CONSTRAINT IF EXISTS in_person_purchases_payment_method_check;

ALTER TABLE public.in_person_purchases
  ADD CONSTRAINT in_person_purchases_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('venmo', 'stripe', 'cash'));

CREATE INDEX IF NOT EXISTS idx_in_person_purchases_payment_method
  ON public.in_person_purchases (payment_method);

