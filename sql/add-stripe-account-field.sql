-- Add stripe_account_id field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id 
ON public.profiles(stripe_account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'Stripe Connect account ID for receiving payments';
