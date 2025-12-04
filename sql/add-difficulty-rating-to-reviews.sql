-- Add difficulty_rating column to reviews table
-- Run this in your Supabase SQL Editor

-- Add difficulty_rating column if it doesn't exist
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS difficulty_rating TEXT;

-- Add check constraint to ensure only valid difficulty levels
ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_difficulty_rating_check;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_difficulty_rating_check 
CHECK (difficulty_rating IS NULL OR difficulty_rating IN ('beginner', 'intermediate', 'advanced', 'expert'));

