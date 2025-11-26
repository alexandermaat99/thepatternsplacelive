-- Add username support to profiles table
-- This migration adds username field with proper validation and security

-- Add username column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;
END $$;

-- Create unique index on username (case-insensitive)
-- This prevents duplicate usernames regardless of case
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- Add check constraint for username format
-- Username must be 3-30 characters, alphanumeric with underscores and hyphens
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND constraint_name = 'profiles_username_format_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_username_format_check 
    CHECK (
      username IS NULL OR (
        LENGTH(username) >= 3 AND 
        LENGTH(username) <= 30 AND
        username ~ '^[a-zA-Z0-9_-]+$'
      )
    );
  END IF;
END $$;

-- Function to generate default username from email
CREATE OR REPLACE FUNCTION public.generate_username_from_email(email text)
RETURNS text AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Extract part before @ and sanitize
  base_username := LOWER(SPLIT_PART(email, '@', 1));
  
  -- Remove any characters that aren't alphanumeric, underscore, or hyphen
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  
  -- Ensure minimum length of 3
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || '123';
  END IF;
  
  -- Truncate to 30 characters
  IF LENGTH(base_username) > 30 THEN
    base_username := LEFT(base_username, 30);
  END IF;
  
  -- Try to find a unique username
  final_username := base_username;
  
  WHILE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(final_username)
  ) LOOP
    counter := counter + 1;
    -- Append number, ensuring we don't exceed 30 chars
    final_username := LEFT(base_username, 30 - LENGTH(counter::text)) || counter::text;
    
    -- Safety check to prevent infinite loop
    IF counter > 9999 THEN
      -- Fallback: use UUID part
      final_username := 'user' || SUBSTRING(gen_random_uuid()::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to set default username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username text;
BEGIN
  -- Generate username from email if email exists
  IF NEW.email IS NOT NULL THEN
    default_username := public.generate_username_from_email(NEW.email);
  ELSE
    -- Fallback: use UUID part
    default_username := 'user' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    default_username
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and update username
-- This ensures username is lowercase and unique
CREATE OR REPLACE FUNCTION public.validate_username()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is being set, ensure it's lowercase
  IF NEW.username IS NOT NULL THEN
    NEW.username := LOWER(TRIM(NEW.username));
    
    -- Check if username is already taken by another user
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE LOWER(username) = NEW.username 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Username "%" is already taken', NEW.username;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate username on insert/update
DROP TRIGGER IF EXISTS validate_username_trigger ON public.profiles;
CREATE TRIGGER validate_username_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_username();

-- Update RLS policies to allow viewing usernames
-- Users can view all profiles (for username lookup), but only update their own
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

-- Keep the existing update policy (users can only update their own profile)
-- This is already handled by the existing policy

-- Add comment to username column
COMMENT ON COLUMN public.profiles.username IS 'Unique username (3-30 chars, alphanumeric with underscores/hyphens). Stored in lowercase.';

