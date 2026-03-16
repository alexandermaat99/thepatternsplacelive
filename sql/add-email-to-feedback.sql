-- Add email column to feedback table (optional contact for follow-up)
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS email TEXT;

-- Optional: index if you expect to query by email often (usually not needed)
-- CREATE INDEX IF NOT EXISTS idx_feedback_email ON public.feedback(email);
