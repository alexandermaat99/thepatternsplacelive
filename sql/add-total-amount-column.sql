-- Add total_amount column to orders table to store amount including tax
-- This matches what Stripe dashboard shows (total amount customer paid)

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);

-- Update existing orders to set total_amount = amount (for backwards compatibility)
-- Note: This assumes existing orders don't have tax, or tax was included in amount
UPDATE public.orders
SET total_amount = amount
WHERE total_amount IS NULL;

-- Add comment
COMMENT ON COLUMN public.orders.total_amount IS 'Total amount including tax (matches Stripe dashboard)';
COMMENT ON COLUMN public.orders.amount IS 'Subtotal amount before tax (for fee calculations)';

