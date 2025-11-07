-- Enhanced Affiliate Commission Tracking
-- This extends the existing affiliate system to support cash commissions

-- Add commission tracking columns to user_affiliates
ALTER TABLE public.user_affiliates 
ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS paid_commission DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_email TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('stripe', 'paypal', NULL));

-- Commission transactions table
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'search_pack')),
  plan_id TEXT, -- subscription plan ID
  amount_paid DECIMAL(10,2) NOT NULL, -- What the customer paid
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 25.00, -- Percentage (25.00 = 25%)
  commission_amount DECIMAL(10,2) NOT NULL, -- Calculated commission
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')) DEFAULT 'pending',
  pending_until TIMESTAMP WITH TIME ZONE, -- When it becomes payable (30 days after subscription start)
  approved_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT, -- Stripe/PayPal transaction ID
  
  -- Metadata
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate payouts table
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payout details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'paypal')),
  payment_email TEXT NOT NULL,
  payment_reference TEXT, -- Transaction ID from payment processor
  
  -- Commission IDs included in this payout
  commission_ids UUID[] NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_commissions
-- Users can view their own commissions
CREATE POLICY "Users can view own commissions"
  ON public.affiliate_commissions
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON public.affiliate_commissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for affiliate_payouts
-- Users can view their own payouts
CREATE POLICY "Users can view own payouts"
  ON public.affiliate_payouts
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

-- Admins can manage all payouts
CREATE POLICY "Admins can manage all payouts"
  ON public.affiliate_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_affiliates (update existing)
CREATE POLICY IF NOT EXISTS "Users can view own affiliate data"
  ON public.user_affiliates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own payment info"
  ON public.user_affiliates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_user ON public.affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_pending_until ON public.affiliate_commissions(pending_until);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_user ON public.affiliate_payouts(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);

-- Function to auto-approve commissions after 30 days
CREATE OR REPLACE FUNCTION auto_approve_commissions()
RETURNS void AS $$
BEGIN
  UPDATE public.affiliate_commissions
  SET 
    status = 'approved',
    approved_date = NOW(),
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND pending_until <= NOW()
    AND EXISTS (
      -- Verify the referred user is still active
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = affiliate_commissions.referred_user_id
      AND status IN ('active', 'trial')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate commission amount
CREATE OR REPLACE FUNCTION calculate_commission(
  amount_paid DECIMAL,
  rate DECIMAL DEFAULT 25.00
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((amount_paid * rate / 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user_affiliates totals when commission is created
CREATE OR REPLACE FUNCTION update_affiliate_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.user_affiliates
    SET 
      pending_commission = pending_commission - NEW.commission_amount,
      total_commission_earned = total_commission_earned + NEW.commission_amount
    WHERE user_id = NEW.affiliate_user_id;
  END IF;
  
  IF NEW.status = 'paid' AND OLD.status = 'approved' THEN
    UPDATE public.user_affiliates
    SET 
      paid_commission = paid_commission + NEW.commission_amount
    WHERE user_id = NEW.affiliate_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_commission_status_change
  AFTER UPDATE ON public.affiliate_commissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_affiliate_totals();

-- View for affiliate dashboard stats
CREATE OR REPLACE VIEW affiliate_dashboard_stats AS
SELECT 
  ua.user_id,
  ua.affiliate_code,
  ua.total_referrals,
  ua.paying_referrals,
  ua.total_bonuses_earned,
  ua.total_commission_earned,
  ua.pending_commission,
  ua.paid_commission,
  ua.payment_email,
  ua.payment_method,
  
  -- Count of commissions by status
  COUNT(CASE WHEN ac.status = 'pending' THEN 1 END) as pending_commissions_count,
  COUNT(CASE WHEN ac.status = 'approved' THEN 1 END) as approved_commissions_count,
  COUNT(CASE WHEN ac.status = 'paid' THEN 1 END) as paid_commissions_count,
  
  -- Sum of commissions by status
  COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as total_pending,
  COALESCE(SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END), 0) as total_approved,
  COALESCE(SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END), 0) as total_paid
  
FROM public.user_affiliates ua
LEFT JOIN public.affiliate_commissions ac ON ua.user_id = ac.affiliate_user_id
GROUP BY 
  ua.user_id,
  ua.affiliate_code,
  ua.total_referrals,
  ua.paying_referrals,
  ua.total_bonuses_earned,
  ua.total_commission_earned,
  ua.pending_commission,
  ua.paid_commission,
  ua.payment_email,
  ua.payment_method;

-- Grant access
GRANT SELECT ON affiliate_dashboard_stats TO authenticated;

COMMENT ON TABLE public.affiliate_commissions IS 'Tracks cash commissions for affiliate referrals (25% of first payment)';
COMMENT ON TABLE public.affiliate_payouts IS 'Tracks batch payouts to affiliates via Stripe/PayPal';
COMMENT ON FUNCTION auto_approve_commissions() IS 'Run daily via cron to auto-approve commissions after 30-day waiting period';

