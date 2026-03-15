-- Add photo_url to fabric if missing (e.g. table created before column was in migration).
-- Run in Supabase SQL Editor. Safe to run multiple times.

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
