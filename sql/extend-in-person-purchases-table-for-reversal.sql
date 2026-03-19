-- Add reversal tracking to in_person_purchases.
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS reversed boolean NOT NULL DEFAULT false;

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS reversed_at timestamp with time zone;

ALTER TABLE public.in_person_purchases
  ADD COLUMN IF NOT EXISTS reversed_by uuid;

-- Optional FK (safe to add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'in_person_purchases'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'in_person_purchases_reversed_by_fkey'
  ) THEN
    ALTER TABLE public.in_person_purchases
      ADD CONSTRAINT in_person_purchases_reversed_by_fkey
      FOREIGN KEY (reversed_by) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Index for common UI filter ("not reversed yet")
CREATE INDEX IF NOT EXISTS idx_in_person_purchases_reversed_created_at
  ON public.in_person_purchases (reversed, created_at DESC);

