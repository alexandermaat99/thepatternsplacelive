-- Create feedback table for user suggestions and problem reports
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT, -- Username at the time of submission (snapshot)
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id (for filtering by user)
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- Create index for username (for filtering by username)
CREATE INDEX IF NOT EXISTS idx_feedback_username ON public.feedback(username);

-- Create index for created_at (for sorting by date)
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert feedback (including anonymous users)
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;

-- Create policy that allows anyone (authenticated or anonymous) to insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can read their own feedback (needed for INSERT ... RETURNING)
-- Authenticated users can read their own feedback
-- Anonymous users can read anonymous feedback (user_id IS NULL)
CREATE POLICY "Users can read their own feedback"
  ON public.feedback
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- RLS Policy: Service role can read all feedback (for admin queries)
CREATE POLICY "Service role can read all feedback"
  ON public.feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Note: No UPDATE or DELETE policies - feedback is append-only
-- Admins can query directly in Supabase dashboard using service role
