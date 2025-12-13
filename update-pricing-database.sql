-- Update subscription plans with new pricing
-- Run this in Supabase SQL Editor to update existing plan records

-- Update Core plans
UPDATE public.subscription_plans
SET 
  searches_per_month = 25,
  price_monthly = 12.50,
  price_annual = 100.00
WHERE id IN ('core_monthly', 'core_annual');

-- Update Prime plans
UPDATE public.subscription_plans
SET 
  searches_per_month = 100,
  price_monthly = 25.00,
  price_annual = 200.00
WHERE id IN ('prime_monthly', 'prime_annual');

-- Update existing monthly_usage records to reflect new search limits
-- This updates the searches_limit for current period usage records based on the user's plan
UPDATE public.monthly_usage mu
SET searches_limit = sp.searches_per_month
FROM public.user_subscriptions us
JOIN public.subscription_plans sp ON us.plan_id = sp.id
WHERE mu.user_id = us.user_id
  AND mu.period_start <= NOW()
  AND mu.period_end >= NOW()
  AND us.plan_id IN ('core_monthly', 'core_annual', 'prime_monthly', 'prime_annual');

-- Verify the changes
SELECT 
  id, 
  name, 
  searches_per_month, 
  price_monthly, 
  price_annual
FROM public.subscription_plans
WHERE id IN ('core_monthly', 'core_annual', 'prime_monthly', 'prime_annual')
ORDER BY 
  CASE 
    WHEN id LIKE 'core%' THEN 1
    WHEN id LIKE 'prime%' THEN 2
    ELSE 3
  END,
  CASE 
    WHEN id LIKE '%monthly' THEN 1
    WHEN id LIKE '%annual' THEN 2
    ELSE 3
  END;

