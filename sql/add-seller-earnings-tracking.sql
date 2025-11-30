-- Add fee tracking columns to orders table for seller earnings dashboard
-- Run this in your Supabase SQL Editor

-- Add platform_fee column (amount TPP keeps)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;

-- Add stripe_fee column (estimated Stripe processing fee)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2) DEFAULT 0;

-- Add net_amount column (what seller actually receives)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0;

-- Add index for faster seller earnings queries
CREATE INDEX IF NOT EXISTS idx_orders_seller_created 
ON public.orders(seller_id, created_at DESC);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON public.orders(status);

-- Update existing orders to calculate net_amount (for historical data)
-- This uses the current fee structure: 5.6% platform + 2.9% + $0.30 Stripe
-- You may want to adjust or skip this if you don't want to backfill
UPDATE public.orders
SET 
  platform_fee = ROUND(amount * 0.056, 2),
  stripe_fee = ROUND(amount * 0.029 + 0.30, 2),
  net_amount = ROUND(amount - (amount * 0.056) - (amount * 0.029 + 0.30), 2)
WHERE net_amount = 0 OR net_amount IS NULL;

-- Create a function to calculate seller stats (useful for dashboard)
CREATE OR REPLACE FUNCTION get_seller_stats(seller_uuid UUID)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  total_fees DECIMAL,
  total_net_earnings DECIMAL,
  sales_this_month BIGINT,
  revenue_this_month DECIMAL,
  net_this_month DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sales,
    COALESCE(SUM(amount), 0)::DECIMAL as total_revenue,
    COALESCE(SUM(platform_fee + stripe_fee), 0)::DECIMAL as total_fees,
    COALESCE(SUM(net_amount), 0)::DECIMAL as total_net_earnings,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as sales_this_month,
    COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::DECIMAL as revenue_this_month,
    COALESCE(SUM(net_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::DECIMAL as net_this_month
  FROM public.orders
  WHERE seller_id = seller_uuid
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_seller_stats(UUID) TO authenticated;

COMMENT ON COLUMN public.orders.platform_fee IS 'Platform transaction fee (TPP commission)';
COMMENT ON COLUMN public.orders.stripe_fee IS 'Estimated Stripe processing fee';
COMMENT ON COLUMN public.orders.net_amount IS 'Net amount seller receives after all fees';

