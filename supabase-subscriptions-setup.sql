-- Subscription and billing tables for App Ideas Finder

-- Subscription plans table (for reference)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  searches_per_month INTEGER NOT NULL,
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, searches_per_month, price_monthly, price_annual) VALUES
  ('trial', 'Trial', 10, 1.00, NULL),
  ('core_monthly', 'Core (Monthly)', 73, 39.00, NULL),
  ('core_annual', 'Core (Annual)', 73, NULL, 399.00),
  ('prime_monthly', 'Prime (Monthly)', 227, 79.00, NULL),
  ('prime_annual', 'Prime (Annual)', 227, NULL, 799.00),
  ('free_unlimited', 'Free Unlimited', -1, 0.00, NULL)
ON CONFLICT (id) DO NOTHING;

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'free_unlimited')),
  
  -- Trial tracking
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Subscription tracking
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Stripe IDs (for future integration)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Affiliate tracking
  referred_by_code TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly usage tracking
CREATE TABLE IF NOT EXISTS public.monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  searches_used INTEGER DEFAULT 0,
  searches_limit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Search packs (extra searches purchased)
CREATE TABLE IF NOT EXISTS public.search_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  searches_purchased INTEGER NOT NULL,
  searches_remaining INTEGER NOT NULL,
  price_paid DECIMAL(10,2),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- NULL means never expires
);

-- Bonuses awarded to users
CREATE TABLE IF NOT EXISTS public.user_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('fixed_searches', 'percentage_increase', 'affiliate_reward')),
  bonus_value INTEGER NOT NULL, -- Number of searches or percentage
  bonus_duration TEXT CHECK (bonus_duration IN ('once', 'monthly', 'permanent', NULL)),
  months_remaining INTEGER, -- For monthly bonuses
  reason TEXT, -- Why bonus was awarded
  awarded_by UUID REFERENCES auth.users(id),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_plan')),
  discount_value DECIMAL(10,2), -- Percentage (e.g., 20) or dollar amount (e.g., 10.00)
  free_plan_id TEXT REFERENCES public.subscription_plans(id), -- If discount_type = 'free_plan'
  max_uses INTEGER, -- NULL = unlimited
  times_used INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupon redemptions tracking
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- Affiliate tracking
CREATE TABLE IF NOT EXISTS public.user_affiliates (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  affiliate_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  paying_referrals INTEGER DEFAULT 0,
  total_bonuses_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate conversions
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  converted_to_paid BOOLEAN DEFAULT false,
  conversion_date TIMESTAMP WITH TIME ZONE,
  bonus_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view their own data
CREATE POLICY "Users view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own usage" ON public.monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own packs" ON public.search_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own bonuses" ON public.user_bonuses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own affiliate" ON public.user_affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own conversions" ON public.affiliate_conversions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_affiliates WHERE affiliate_code = affiliate_conversions.affiliate_code
    )
  );

-- Admins can view/manage everything
CREATE POLICY "Admins manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins manage usage" ON public.monthly_usage
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins manage bonuses" ON public.user_bonuses
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins manage affiliates" ON public.user_affiliates
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_monthly_usage_user_id ON public.monthly_usage(user_id);
CREATE INDEX idx_monthly_usage_period ON public.monthly_usage(period_start, period_end);
CREATE INDEX idx_search_packs_user_id ON public.search_packs(user_id);
CREATE INDEX idx_user_bonuses_user_id ON public.user_bonuses(user_id);
CREATE INDEX idx_affiliate_code ON public.user_affiliates(affiliate_code);

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.user_affiliates WHERE affiliate_code = code) INTO exists;
    
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create affiliate code when user subscription is created
CREATE OR REPLACE FUNCTION create_user_affiliate()
RETURNS TRIGGER AS $$
BEGIN
  -- Create affiliate record if it doesn't exist
  INSERT INTO public.user_affiliates (user_id, affiliate_code)
  VALUES (NEW.user_id, generate_affiliate_code())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscription_created
  AFTER INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_user_affiliate();

-- Function to initialize new user with trial
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
  trial_start TIMESTAMP WITH TIME ZONE;
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  trial_start := NOW();
  trial_end := trial_start + INTERVAL '3 days';
  
  -- Create trial subscription
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan_id, 
    status, 
    trial_start_date, 
    trial_end_date,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'trial',
    'trial',
    trial_start,
    trial_end,
    trial_start,
    trial_end
  );
  
  -- Create initial monthly usage record
  INSERT INTO public.monthly_usage (
    user_id,
    period_start,
    period_end,
    searches_used,
    searches_limit
  ) VALUES (
    NEW.id,
    trial_start,
    trial_end,
    0,
    10 -- Trial gets 10 searches
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user creation
CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_subscription();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_monthly_usage_updated_at
  BEFORE UPDATE ON public.monthly_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

