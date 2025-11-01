-- Migration script to add subscriptions for existing users who don't have one yet
-- This will assign them a Trial subscription by default

-- Add subscriptions for all users who don't have one
INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  trial_start_date,
  trial_end_date,
  current_period_start,
  current_period_end
)
SELECT 
  au.id as user_id,
  'trial' as plan_id,
  'trial' as status,
  NOW() as trial_start_date,
  NOW() + INTERVAL '3 days' as trial_end_date,
  NOW() as current_period_start,
  NOW() + INTERVAL '3 days' as current_period_end
FROM auth.users au
LEFT JOIN public.user_subscriptions us ON au.id = us.user_id
WHERE us.id IS NULL;

-- Add monthly usage tracking for these users
INSERT INTO public.monthly_usage (
  user_id,
  period_start,
  period_end,
  searches_used,
  searches_limit
)
SELECT 
  au.id as user_id,
  NOW() as period_start,
  NOW() + INTERVAL '3 days' as period_end,
  0 as searches_used,
  10 as searches_limit -- Trial gets 10 searches
FROM auth.users au
LEFT JOIN public.monthly_usage mu ON au.id = mu.user_id
WHERE mu.id IS NULL;

-- Generate affiliate codes for existing users who don't have one
INSERT INTO public.user_affiliates (
  user_id,
  affiliate_code,
  total_referrals,
  paying_referrals,
  total_bonuses_earned
)
SELECT 
  au.id as user_id,
  substring(md5(random()::text || au.id::text) from 1 for 8) as affiliate_code,
  0 as total_referrals,
  0 as paying_referrals,
  0 as total_bonuses_earned
FROM auth.users au
LEFT JOIN public.user_affiliates ua ON au.id = ua.user_id
WHERE ua.user_id IS NULL;

-- Verification query - run this to check results
SELECT 
  au.email,
  us.plan_id,
  us.status,
  us.trial_end_date,
  mu.searches_used,
  mu.searches_limit,
  ua.affiliate_code
FROM auth.users au
LEFT JOIN public.user_subscriptions us ON au.id = us.user_id
LEFT JOIN public.monthly_usage mu ON au.id = mu.user_id
LEFT JOIN public.user_affiliates ua ON au.id = ua.user_id
ORDER BY au.created_at DESC;

