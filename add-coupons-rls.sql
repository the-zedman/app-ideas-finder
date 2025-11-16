-- Add extra fields and RLS policies for coupons & coupon_redemptions

-- Optional metadata for Stripe mapping and human-readable description
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_promotion_code TEXT;

-- Enable RLS on coupons and coupon_redemptions if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'coupons'
  ) THEN
    ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'coupon_redemptions'
  ) THEN
    ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

-- Admins can manage coupons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coupons' 
      AND policyname = 'Admins manage coupons'
  ) THEN
    CREATE POLICY "Admins manage coupons" ON public.coupons
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admins)
      );
  END IF;
END$$;

-- Admins can manage coupon redemptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coupon_redemptions' 
      AND policyname = 'Admins manage coupon redemptions'
  ) THEN
    CREATE POLICY "Admins manage coupon redemptions" ON public.coupon_redemptions
      FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.admins)
      );
  END IF;
END$$;

-- Users can view their own coupon redemptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coupon_redemptions' 
      AND policyname = 'Users view own coupon redemptions'
  ) THEN
    CREATE POLICY "Users view own coupon redemptions" ON public.coupon_redemptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END$$;


