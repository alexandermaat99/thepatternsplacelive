-- Add first 5 sales fee waiver feature
-- New sellers don't pay platform fees (listing + transaction fees) on their first 5 sales
-- Payment processing fees (Stripe) still apply

-- Add completed_sales_count column to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'completed_sales_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN completed_sales_count INTEGER DEFAULT 0 NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.profiles.completed_sales_count IS 'Number of completed sales for this seller. Used to determine if seller qualifies for first 5 sales fee waiver.';
  END IF;
END $$;

-- Backfill completed_sales_count for existing sellers
-- Count completed orders where this user is the seller
UPDATE public.profiles
SET completed_sales_count = (
  SELECT COUNT(*)
  FROM public.orders
  WHERE orders.seller_id = profiles.id
    AND orders.status = 'completed'
);

-- Create function to increment sales count when order is completed
CREATE OR REPLACE FUNCTION public.increment_seller_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment when order status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET completed_sales_count = completed_sales_count + 1
    WHERE id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically increment sales count
DROP TRIGGER IF EXISTS trigger_increment_seller_sales_count ON public.orders;
CREATE TRIGGER trigger_increment_seller_sales_count
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_seller_sales_count();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_completed_sales_count 
ON public.profiles(completed_sales_count);

-- Note: The application code will need to be updated to:
-- 1. Check completed_sales_count before calculating fees
-- 2. Waive platform fees (listing + transaction) if count < 5
-- 3. Still charge payment processing fees (Stripe fees)

