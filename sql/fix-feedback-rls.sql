-- Fix RLS policies for feedback table to allow anonymous inserts
-- Run this in your Supabase SQL Editor if feedback submissions are failing with permission errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Only service role can read feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can read their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Service role can read all feedback" ON public.feedback;

-- Recreate INSERT policy - allows anyone (authenticated or anonymous) to insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own feedback (needed for INSERT ... RETURNING to work)
-- Authenticated users can read their own feedback
-- Anonymous users can read anonymous feedback (user_id IS NULL)
CREATE POLICY "Users can read their own feedback"
  ON public.feedback
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Allow service role to read all feedback (for admin queries in Supabase dashboard)
CREATE POLICY "Service role can read all feedback"
  ON public.feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'feedback'
ORDER BY policyname;
