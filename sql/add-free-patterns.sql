-- Add is_free field to products table
-- This allows products to be marked as free patterns that don't require Stripe checkout

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_free'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_free BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index for filtering free products
CREATE INDEX IF NOT EXISTS idx_products_is_free ON public.products(is_free) WHERE is_free = true;

-- Add constraint: if is_free is true, price should be 0
-- Note: We'll handle this in application logic, but this ensures data integrity
-- ALTER TABLE public.products ADD CONSTRAINT products_free_price_check 
--   CHECK ((is_free = false) OR (is_free = true AND price = 0));
