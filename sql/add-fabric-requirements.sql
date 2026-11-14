-- How much fabric a pattern needs (per size), so buyers can see it and buy
-- matching fabric with the pattern. Run in the Supabase SQL editor.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabric_requirements jsonb;

COMMENT ON COLUMN public.products.fabric_requirements IS
  'Optional. { fabricType: woven|knit|either, suggested: text, widthInches: 45|60, sizes: [{ label, yards }] }';
