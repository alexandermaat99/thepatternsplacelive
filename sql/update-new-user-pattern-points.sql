-- Update handle_new_user function to award 20 pattern points to new users
-- Run this in your Supabase SQL Editor after running add-pattern-points.sql

-- Update the handle_new_user function to set pattern_points to 20 for new users
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
  
  INSERT INTO public.profiles (id, full_name, avatar_url, username, pattern_points)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_username,
    20  -- Award 20 pattern points to new users
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
