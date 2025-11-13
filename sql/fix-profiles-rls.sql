-- Fix RLS policies for profiles table to allow avatar updates
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles for avatars" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow public to view avatar_url (needed for displaying avatars in nav)
CREATE POLICY "Public can view profiles for avatars" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile (with proper WITH CHECK)
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

