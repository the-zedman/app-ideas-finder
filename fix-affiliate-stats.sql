-- Fix Affiliate Statistics
-- This script recalculates all affiliate stats based on actual data
-- Run this to clean up incorrect counts from before the fixes

-- Step 1: Recalculate total_referrals based on actual affiliate_conversions
UPDATE public.user_affiliates ua
SET total_referrals = (
  SELECT COUNT(DISTINCT ac.referred_user_id)
  FROM public.affiliate_conversions ac
  WHERE ac.affiliate_code = ua.affiliate_code
);

-- Step 2: Recalculate paying_referrals based on actual commissions with payment > 0
UPDATE public.user_affiliates ua
SET paying_referrals = (
  SELECT COUNT(DISTINCT ac.referred_user_id)
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_user_id = ua.user_id
    AND ac.amount_paid > 0
    AND ac.commission_amount > 0
);

-- Step 3: Recalculate pending_commission based on pending commissions
UPDATE public.user_affiliates ua
SET pending_commission = COALESCE((
  SELECT SUM(ac.commission_amount)
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_user_id = ua.user_id
    AND ac.status = 'pending'
    AND ac.amount_paid > 0
    AND ac.commission_amount > 0
), 0);

-- Step 4: Recalculate total_commission_earned based on approved + paid commissions
UPDATE public.user_affiliates ua
SET total_commission_earned = COALESCE((
  SELECT SUM(ac.commission_amount)
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_user_id = ua.user_id
    AND ac.status IN ('approved', 'paid')
    AND ac.amount_paid > 0
    AND ac.commission_amount > 0
), 0);

-- Step 5: Recalculate paid_commission based on paid commissions
UPDATE public.user_affiliates ua
SET paid_commission = COALESCE((
  SELECT SUM(ac.commission_amount)
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_user_id = ua.user_id
    AND ac.status = 'paid'
    AND ac.amount_paid > 0
    AND ac.commission_amount > 0
), 0);

-- Verification queries - run these to check the results

-- Check total referrals vs conversions
SELECT 
  ua.affiliate_code,
  ua.total_referrals as stored_total,
  COUNT(DISTINCT ac.referred_user_id) as actual_total,
  ua.total_referrals - COUNT(DISTINCT ac.referred_user_id) as difference
FROM public.user_affiliates ua
LEFT JOIN public.affiliate_conversions ac ON ac.affiliate_code = ua.affiliate_code
GROUP BY ua.affiliate_code, ua.total_referrals
HAVING ua.total_referrals != COUNT(DISTINCT ac.referred_user_id)
ORDER BY difference DESC;

-- Check paying referrals vs commissions with payment
SELECT 
  ua.affiliate_code,
  ua.paying_referrals as stored_paying,
  COUNT(DISTINCT ac.referred_user_id) as actual_paying,
  ua.paying_referrals - COUNT(DISTINCT ac.referred_user_id) as difference
FROM public.user_affiliates ua
LEFT JOIN public.affiliate_commissions ac ON ac.affiliate_user_id = ua.user_id
  AND ac.amount_paid > 0
  AND ac.commission_amount > 0
GROUP BY ua.affiliate_code, ua.paying_referrals
HAVING ua.paying_referrals != COUNT(DISTINCT ac.referred_user_id)
ORDER BY difference DESC;

-- Summary of all affiliate stats
SELECT 
  ua.affiliate_code,
  ua.total_referrals,
  ua.paying_referrals,
  ua.total_commission_earned,
  ua.pending_commission,
  ua.paid_commission,
  COUNT(DISTINCT conv.referred_user_id) as actual_conversions,
  COUNT(DISTINCT comm.referred_user_id) as actual_paying_count
FROM public.user_affiliates ua
LEFT JOIN public.affiliate_conversions conv ON conv.affiliate_code = ua.affiliate_code
LEFT JOIN public.affiliate_commissions comm ON comm.affiliate_user_id = ua.user_id
  AND comm.amount_paid > 0
  AND comm.commission_amount > 0
GROUP BY 
  ua.affiliate_code,
  ua.total_referrals,
  ua.paying_referrals,
  ua.total_commission_earned,
  ua.pending_commission,
  ua.paid_commission
ORDER BY ua.total_referrals DESC;

