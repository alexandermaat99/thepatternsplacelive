-- Add pattern_points column to profiles table
-- Run this in your Supabase SQL Editor

-- Add pattern_points column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'pattern_points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pattern_points INTEGER DEFAULT 20 NOT NULL;
  END IF;
END $$;

-- Add index for better performance when querying by points
CREATE INDEX IF NOT EXISTS idx_profiles_pattern_points ON public.profiles(pattern_points DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pattern_points IS 'Points earned by user through buying, selling, listing products, and leaving reviews';

-- Create function to award pattern points
CREATE OR REPLACE FUNCTION award_pattern_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  -- Update the user's pattern points
  UPDATE public.profiles
  SET pattern_points = COALESCE(pattern_points, 0) + p_points
  WHERE id = p_user_id
  RETURNING pattern_points INTO new_total;
  
  -- Return the new total (or 0 if user not found)
  RETURN COALESCE(new_total, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_pattern_points TO authenticated, anon;

-- Update handle_new_user function to award 20 pattern points to new users
-- This ensures new users get 20 points when they sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username text;
BEGIN
  -- Generate username from email if email exists
  IF NEW.email IS NOT NULL THEN
    -- Check if generate_username_from_email function exists
    BEGIN
      default_username := public.generate_username_from_email(NEW.email);
    EXCEPTION WHEN OTHERS THEN
      -- Fallback if function doesn't exist
      default_username := 'user' || SUBSTRING(NEW.id::text, 1, 8);
    END;
  ELSE
    -- Fallback: use UUID part
    default_username := 'user' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  
  -- Insert profile with 20 pattern points for new users
  INSERT INTO public.profiles (id, full_name, avatar_url, username, pattern_points)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_username,
    20  -- Award 20 pattern points to new users
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent errors if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
