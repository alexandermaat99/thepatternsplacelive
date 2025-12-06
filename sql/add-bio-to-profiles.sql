-- Add bio column to profiles table
-- This allows users to add a public bio that will be visible on their seller profile page

-- Add bio column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
    
    -- Add comment
    COMMENT ON COLUMN public.profiles.bio IS 'Public bio that appears on seller profile pages. Maximum 500 characters.';
  END IF;
END $$;

-- Note: No RLS policy needed - bio is public information that anyone can view
-- Users can only update their own bio (handled by existing RLS policy on UPDATE)

