-- Function to increment affiliate referrals count
-- This is called when a new user signs up with an affiliate code

CREATE OR REPLACE FUNCTION increment_affiliate_referrals(affiliate_code_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_affiliates
  SET total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE affiliate_code = affiliate_code_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (though this will be called via service role)
GRANT EXECUTE ON FUNCTION increment_affiliate_referrals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_affiliate_referrals(TEXT) TO service_role;

