-- Remove trial plan from database
-- Run this in Supabase SQL Editor to clean up trial-related structures

-- Step 1: Delete trial plan from subscription_plans
DELETE FROM public.subscription_plans WHERE id = 'trial';

-- Step 2: Update existing trial subscriptions to active (or cancelled if expired)
-- Convert active trial subscriptions to active status
UPDATE public.user_subscriptions
SET status = 'active'
WHERE status = 'trial' 
  AND (trial_end_date IS NULL OR trial_end_date > NOW());

-- Convert expired trial subscriptions to expired status
UPDATE public.user_subscriptions
SET status = 'expired'
WHERE status = 'trial' 
  AND trial_end_date IS NOT NULL 
  AND trial_end_date <= NOW();

-- Step 3: Update plan_id for users who had trial plan
-- Convert to core_monthly as default
UPDATE public.user_subscriptions
SET plan_id = 'core_monthly'
WHERE plan_id = 'trial';

-- Step 4: Remove 'trial' from status constraint
-- First, drop the existing constraint
ALTER TABLE public.user_subscriptions 
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

-- Recreate constraint without 'trial'
ALTER TABLE public.user_subscriptions 
  ADD CONSTRAINT user_subscriptions_status_check 
  CHECK (status IN ('active', 'cancelled', 'expired', 'free_unlimited'));

-- Step 5: Verify removal
-- Check if trial plan still exists
SELECT 
  'Trial Plan Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ FAIL: Trial plan still exists'
    ELSE '✅ PASS: Trial plan removed'
  END as result
FROM public.subscription_plans
WHERE id = 'trial';

-- Check if any subscriptions still have trial status
SELECT 
  'Trial Status Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('❌ FAIL: ', COUNT(*), ' subscriptions still have trial status')
    ELSE '✅ PASS: No subscriptions with trial status'
  END as result
FROM public.user_subscriptions
WHERE status = 'trial';

-- Check if any subscriptions still have trial plan_id
SELECT 
  'Trial Plan ID Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('❌ FAIL: ', COUNT(*), ' subscriptions still have trial plan_id')
    ELSE '✅ PASS: No subscriptions with trial plan_id'
  END as result
FROM public.user_subscriptions
WHERE plan_id = 'trial';

-- Summary
SELECT 
  'SUMMARY' as check_type,
  'Review individual check results above' as result;

