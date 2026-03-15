-- Seed fabric inventory from provided data.
-- Only inserts into columns that exist: sku, name, description, weave, width, current_quantity, buy_price, sell_price.
-- purchase_quantity and photo_url left NULL. Run in Supabase SQL Editor.

INSERT INTO public.fabric (sku, name, description, weave, width, current_quantity, buy_price, sell_price)
VALUES
  ('PDP002', 'Polka Dot Princess', 'White black polka dot', 'Poplin', 58, 21, 3.62, 10.00),
  ('PACG003', 'Peaches and Cream Ghingham', 'white pink small', 'Mini Gingham Poplin', 57, 20, 4.75, 11.50),
  ('IBMG005', 'Itty Bitty Micro Gingham', 'Black white mini gingham', 'Poplin', 46, 9, 4.75, 12.11),
  ('LLT006', 'Lucky Leprechaun Twill', 'Forest green with thin light green lines', 'Twill', 58, 9, 4.75, 12.11),
  ('NYGC007', 'Not yo Grandma''s Couch', 'lilac with floral pattern searsucker', 'Poplin', 60, 7, 4.75, 12.11),
  ('LDL009', 'Lacy Days Lace', 'White flower lace', 'Lace', 57, 6, 5.75, 14.66),
  ('PPP010', 'Pleasant Picnic Plaid', 'Blue pink small plaid', 'Poplin', 46, 5, 4.75, 12.11),
  ('AGCO012', 'A Good Case of Stripes', 'Yellow, orange, red, pink stripes', 'Poplin', NULL, 4, 4.75, 12.11),
  ('BACS013', 'Berries & Cream Slight Searsucker', 'Blue white red light searsucker plaid', 'Searsucker', NULL, 4, 4.75, 12.11),
  ('GOG014', 'Golfballs on Grass', 'Green polka dot', 'Crepe', NULL, 2, 4.75, 12.11),
  ('MMIH015', 'Mini Marshmallows in Hot Coco', 'Brown polka dot', 'Crepe', NULL, 2, 4.75, 12.11),
  ('SSP016', 'Sailor Striped Ponte', 'Royal blue and white stripe', 'Knit Ponte', NULL, 2, 5.75, 14.66),
  ('BBW017', 'Blissful Basket Weave', 'White decorative basket weave', 'Poplin', NULL, 2, 4.75, 12.11),
  ('GPBC018', 'Graph Paper but Chic', 'Black and blue', 'Tweed', NULL, 2, 8.00, 20.40),
  ('RRR19', 'Rosy Red Rib', 'Pink rose, pink backing', 'Rib', NULL, 2, 4.75, 12.11),
  ('BBP020', 'Baby Blue Plaid', 'light blue small plaid', 'Poplin', NULL, 1, 4.75, 12.11)
ON CONFLICT (sku) DO NOTHING;
