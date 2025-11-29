-- Insert 10 new products into the products table
-- Note: You'll need to replace the image_urls, images arrays, and file URLs with actual Supabase storage URLs after uploading the files

INSERT INTO products (
  id,
  title,
  description,
  price,
  currency,
  image_url,
  category,
  user_id,
  is_active,
  created_at,
  updated_at,
  images,
  difficulty,
  details,
  files
) VALUES
(
  gen_random_uuid(),
  'Coastal Breeze Blouse',
  'A relaxed, flowing blouse perfect for summer days. Features puffed sleeves, a comfortable fit, and a beautiful tie detail at the neckline. Made for easy movement and effortless style.',
  18.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/coastal-breeze-1.webp',
  'clothing, womens, blouse, tops',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/coastal-breeze-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/coastal-breeze-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/coastal-breeze-3.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. The sewing pattern includes written instructions with step-by-step photos.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/coastal-breeze-pattern.pdf']
),
(
  gen_random_uuid(),
  'Urban Jumpsuit',
  'A modern, versatile jumpsuit that transitions seamlessly from day to night. Features wide-leg pants, a cinched waist, and adjustable straps for a perfect fit.',
  25.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/urban-jumpsuit-1.webp',
  'clothing, womens, jumpsuit, one-piece',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/urban-jumpsuit-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/urban-jumpsuit-2.webp"]'::jsonb,
  'advanced',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. This pattern requires intermediate to advanced sewing skills.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/urban-jumpsuit-pattern.pdf']
),
(
  gen_random_uuid(),
  'Linen Wrap Skirt',
  'An elegant wrap skirt made from beautiful linen. Features a flattering A-line silhouette, adjustable wrap closure, and perfect for any season.',
  15.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-wrap-skirt-1.webp',
  'clothing, womens, skirt, bottoms',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-wrap-skirt-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-wrap-skirt-2.webp"]'::jsonb,
  'beginner',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Perfect for beginners! Includes detailed instructions.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-wrap-skirt-pattern.pdf']
),
(
  gen_random_uuid(),
  'Vintage Tea Dress',
  'A charming tea-length dress inspired by vintage styles. Features a fitted bodice, full skirt, and delicate buttons down the front. Perfect for garden parties and special occasions.',
  22.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/vintage-tea-dress-1.webp',
  'clothing, womens, dress, vintage',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/vintage-tea-dress-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/vintage-tea-dress-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/vintage-tea-dress-3.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes detailed instructions and fabric recommendations.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/vintage-tea-dress-pattern.pdf']
),
(
  gen_random_uuid(),
  'Cozy Cardigan',
  'A relaxed, oversized cardigan perfect for layering. Features long sleeves, a button-up front, and pockets. Made for ultimate comfort and style.',
  19.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cozy-cardigan-1.webp',
  'clothing, womens, cardigan, sweater, outerwear',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cozy-cardigan-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cozy-cardigan-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Perfect for beginners who want to try knitting or crocheting alternatives.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/cozy-cardigan-pattern.pdf']
),
(
  gen_random_uuid(),
  'Boho Maxi Dress',
  'A flowing maxi dress with bohemian vibes. Features an elasticated top, tiered skirt, and adjustable straps. Perfect for music festivals and summer adventures.',
  21.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/boho-maxi-dress-1.webp',
  'clothing, womens, dress, boho, maxi',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/boho-maxi-dress-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/boho-maxi-dress-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/boho-maxi-dress-3.webp"]'::jsonb,
  'beginner',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Easy to sew with minimal pattern pieces. Great for beginners!
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/boho-maxi-dress-pattern.pdf']
),
(
  gen_random_uuid(),
  'Tailored Trousers',
  'Classic tailored trousers with a modern fit. Features a high waist, straight leg, and professional finish. Perfect for office wear or casual occasions.',
  23.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tailored-trousers-1.webp',
  'clothing, womens, pants, trousers, bottoms',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tailored-trousers-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tailored-trousers-2.webp"]'::jsonb,
  'advanced',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. This pattern requires advanced sewing skills and knowledge of tailoring techniques.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/tailored-trousers-pattern.pdf']
),
(
  gen_random_uuid(),
  'Pleated Midi Skirt',
  'An elegant pleated midi skirt that adds movement and sophistication to any outfit. Features hidden pockets and a comfortable elasticated waistband.',
  16.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/pleated-midi-skirt-1.webp',
  'clothing, womens, skirt, pleated, midi',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/pleated-midi-skirt-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/pleated-midi-skirt-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes instructions for creating perfect pleats.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/pleated-midi-skirt-pattern.pdf']
),
(
  gen_random_uuid(),
  'Linen Button-Up Shirt',
  'A timeless button-up shirt made from breathable linen. Features a relaxed fit, roll-up sleeves, and classic collar. Perfect for both casual and professional settings.',
  17.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-button-up-1.webp',
  'clothing, womens, shirt, blouse, tops',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-button-up-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-button-up-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Classic shirt-making techniques included in instructions.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/linen-button-up-pattern.pdf']
),
(
  gen_random_uuid(),
  'Cropped Wide-Leg Pants',
  'Trendy cropped wide-leg pants with a high waist and flowing silhouette. Features side pockets and a comfortable elasticated back waistband. Perfect for summer styling.',
  20.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-wide-leg-1.webp',
  'clothing, womens, pants, wide-leg, cropped',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-wide-leg-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-wide-leg-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Modern fit with comfortable construction techniques.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-wide-leg-pattern.pdf']
),
(
  gen_random_uuid(),
  'Flowy Palazzo Pants',
  'Comfortable and stylish palazzo pants with a wide-leg silhouette. Features an elasticated waistband and flowing fabric that moves beautifully. Perfect for casual or dressy occasions.',
  18.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/palazzo-pants-1.webp',
  'clothing, womens, pants, palazzo, wide-leg',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/palazzo-pants-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/palazzo-pants-2.webp"]'::jsonb,
  'beginner',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Simple construction makes this perfect for beginners.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/palazzo-pants-pattern.pdf']
),
(
  gen_random_uuid(),
  'Off-Shoulder Crop Top',
  'A trendy off-shoulder crop top with elasticated edges for a perfect fit. Features flutter sleeves and a flattering cropped length. Pair with high-waisted bottoms for a modern look.',
  14.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/off-shoulder-crop-1.webp',
  'clothing, womens, top, crop top, casual',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/off-shoulder-crop-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/off-shoulder-crop-2.webp"]'::jsonb,
  'beginner',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Quick and easy project perfect for beginners.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/off-shoulder-crop-pattern.pdf']
),
(
  gen_random_uuid(),
  'Floral Wrap Midi Dress',
  'A beautiful wrap-style midi dress with a flattering V-neck and tie waist. Features a flowy skirt and delicate design perfect for spring and summer occasions.',
  24.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/floral-wrap-dress-1.webp',
  'clothing, womens, dress, wrap, midi',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/floral-wrap-dress-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/floral-wrap-dress-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/floral-wrap-dress-3.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes instructions for creating the wrap closure.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/floral-wrap-dress-pattern.pdf']
),
(
  gen_random_uuid(),
  'Chunky Knit Sweater',
  'A cozy oversized sweater with a relaxed fit and chunky knit texture. Features a boat neckline and dropped shoulders for a modern, comfortable silhouette.',
  26.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/chunky-knit-sweater-1.webp',
  'clothing, womens, sweater, knit, casual',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/chunky-knit-sweater-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/chunky-knit-sweater-2.webp"]'::jsonb,
  'advanced',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. This pattern includes advanced knitting techniques and shaping.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/chunky-knit-sweater-pattern.pdf']
),
(
  gen_random_uuid(),
  'Gathered Midi Skirt',
  'An elegant gathered midi skirt with a high waist and full silhouette. Features a smooth front panel and gathered back for a polished look. Perfect for both casual and dressy occasions.',
  16.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/gathered-midi-skirt-1.webp',
  'clothing, womens, skirt, midi, gathered',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/gathered-midi-skirt-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/gathered-midi-skirt-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes techniques for creating beautiful gathers.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/gathered-midi-skirt-pattern.pdf']
),
(
  gen_random_uuid(),
  'Sleeveless Blazer',
  'A chic sleeveless blazer perfect for layering. Features a structured front, button closure, and professional finish. Great for office wear or adding polish to casual outfits.',
  27.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/sleeveless-blazer-1.webp',
  'clothing, womens, blazer, vest, outerwear',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/sleeveless-blazer-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/sleeveless-blazer-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/sleeveless-blazer-3.webp"]'::jsonb,
  'advanced',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Requires advanced tailoring skills including interfacing and structured construction.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/sleeveless-blazer-pattern.pdf']
),
(
  gen_random_uuid(),
  'Tiered Maxi Dress',
  'A beautiful tiered maxi dress with multiple layers creating a flowing, romantic silhouette. Features adjustable spaghetti straps and a comfortable elasticated top.',
  23.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tiered-maxi-dress-1.webp',
  'clothing, womens, dress, maxi, tiered',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tiered-maxi-dress-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/tiered-maxi-dress-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes instructions for creating multiple tiers.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/tiered-maxi-dress-pattern.pdf']
),
(
  gen_random_uuid(),
  'High-Waisted Shorts',
  'Classic high-waisted shorts with a modern fit. Features a wide waistband, side pockets, and a comfortable length. Perfect for summer styling.',
  15.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/high-waisted-shorts-1.webp',
  'clothing, womens, shorts, bottoms, casual',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/high-waisted-shorts-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/high-waisted-shorts-2.webp"]'::jsonb,
  'beginner',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Great beginner project with straightforward construction.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/high-waisted-shorts-pattern.pdf']
),
(
  gen_random_uuid(),
  'Ruffled Blouse',
  'A feminine blouse with delicate ruffles along the neckline and sleeves. Features a button-up front and a relaxed fit. Perfect for adding elegance to any outfit.',
  19.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/ruffled-blouse-1.webp',
  'clothing, womens, blouse, top, ruffled',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/ruffled-blouse-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/ruffled-blouse-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Includes techniques for creating beautiful ruffles.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/ruffled-blouse-pattern.pdf']
),
(
  gen_random_uuid(),
  'A-Line Mini Dress',
  'A flattering A-line mini dress with a fitted bodice and flared skirt. Features a zipper closure in the back and classic silhouette that never goes out of style.',
  21.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/aline-mini-dress-1.webp',
  'clothing, womens, dress, mini, a-line',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/aline-mini-dress-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/aline-mini-dress-2.webp"]'::jsonb,
  'intermediate',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Classic design with detailed zipper installation instructions.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/aline-mini-dress-pattern.pdf']
),
(
  gen_random_uuid(),
  'Cropped Blazer',
  'A modern cropped blazer with structured shoulders and a shorter length. Features two-button closure and notch lapels. Perfect for both professional and casual wear.',
  28.00,
  'USD',
  'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-blazer-1.webp',
  'clothing, womens, blazer, jacket, outerwear',
  'c8815245-5ae9-4f50-80a4-4428c5e08c73',
  true,
  NOW(),
  NOW(),
  '["https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-blazer-1.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-blazer-2.webp", "https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/public/product-images/c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-blazer-3.webp"]'::jsonb,
  'advanced',
  'The sewing pattern comes as a digital download. You will be able to download the file after purchasing and print it out.

The pattern comes in A0, A4 and US Letter formats.

Size range: XS-XXL

You will receive all sizes.

Note:
1. Advanced tailoring techniques required including structured construction and interfacing.
2. The sewing pattern is for personal use only, you cannot use this pattern for commercial use.',
  ARRAY['c8815245-5ae9-4f50-80a4-4428c5e08c73/cropped-blazer-pattern.pdf']
);

