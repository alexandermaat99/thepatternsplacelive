-- Founding Designers + protection for privileged profile columns
-- Run this in the Supabase SQL editor BEFORE deploying the code that uses it.
-- Safe to run more than once.

-- 1. New columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_designer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_waived_until timestamptz;

COMMENT ON COLUMN public.profiles.founding_designer IS
  'Shows the Founding Designer badge and homepage spotlight. Permanent; set by an admin.';
COMMENT ON COLUMN public.profiles.platform_fee_waived_until IS
  'Platform fees are waived on sales until this time (payment processing still applies). Set by an admin.';

CREATE INDEX IF NOT EXISTS idx_profiles_founding_designer
  ON public.profiles (founding_designer)
  WHERE founding_designer;

-- 2. Protect privileged columns.
-- The "Users can update their own profile" RLS policy lets a signed-in user
-- update ANY column on their own row from the browser, including `admin`
-- (admin pages) and `completed_sales_count` (fee waiver). This trigger keeps
-- those columns unchanged for browser/API requests, which run as the
-- `authenticated` or `anon` role. The service role, the SQL editor (postgres),
-- and SECURITY DEFINER functions such as increment_seller_sales_count are
-- unaffected. It reverts silently instead of raising, so profile-edit forms
-- that send the whole row keep working.
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.admin := false;
      NEW.completed_sales_count := 0;
      NEW.founding_designer := false;
      NEW.platform_fee_waived_until := NULL;
    ELSE
      NEW.admin := OLD.admin;
      NEW.completed_sales_count := OLD.completed_sales_count;
      NEW.founding_designer := OLD.founding_designer;
      NEW.platform_fee_waived_until := OLD.platform_fee_waived_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_columns ON public.profiles;
CREATE TRIGGER protect_privileged_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- 3. Check that it worked (should list both new columns):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name IN ('founding_designer', 'platform_fee_waived_until');

-- ---------------------------------------------------------------------------
-- HOW TO ADD A FOUNDING DESIGNER (run in the SQL editor):
--
--   UPDATE public.profiles
--   SET founding_designer = true,
--       platform_fee_waived_until = now() + interval '12 months'
--   WHERE username = 'their-username';
--
-- To end a waiver early:  SET platform_fee_waived_until = now()
-- To remove the badge:    SET founding_designer = false
-- ---------------------------------------------------------------------------
