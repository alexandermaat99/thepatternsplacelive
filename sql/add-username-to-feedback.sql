-- Add username column to feedback table
-- This stores the username at the time of submission (snapshot)
-- Run this in your Supabase SQL Editor

-- Add username column (nullable, since anonymous users won't have one)
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create index for username (for filtering queries)
CREATE INDEX IF NOT EXISTS idx_feedback_username ON public.feedback(username);

-- Add comment
COMMENT ON COLUMN public.feedback.username IS 'Username at the time of feedback submission (snapshot)';
