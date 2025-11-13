-- Marketplace Schema Migration
-- Run this in your Supabase SQL Editor
-- This script safely handles existing tables and only creates what's missing

-- Add stripe_account_id to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'stripe_account_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_account_id text;
  END IF;
END $$;

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  image_url text,
  category text,
  user_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Create orders table if it doesn't exist
-- Supports both authenticated buyers (buyer_id) and guest buyers (buyer_email)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  buyer_id uuid, -- NULL for guest buyers
  buyer_email text, -- Required for guest buyers
  seller_id uuid NOT NULL, -- Sellers always have accounts
  stripe_session_id text,
  status text DEFAULT 'pending'::text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id),
  -- Ensure either buyer_id (authenticated) or buyer_email (guest) is provided
  CONSTRAINT orders_buyer_check CHECK (
    (buyer_id IS NOT NULL) OR (buyer_email IS NOT NULL)
  )
);

-- If orders table already exists, alter it to support guest buyers
DO $$ 
BEGIN
  -- Make buyer_id nullable if it's currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'buyer_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN buyer_id DROP NOT NULL;
  END IF;
  
  -- Add buyer_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'buyer_email'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN buyer_email text;
  END IF;
  
  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND constraint_name = 'orders_buyer_check'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_check CHECK (
      (buyer_id IS NOT NULL) OR (buyer_email IS NOT NULL)
    );
  END IF;
END $$;
