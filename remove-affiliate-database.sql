-- Remove all affiliate program database structures
-- Run this script in Supabase SQL Editor to clean up affiliate-related tables, columns, functions, and triggers

-- Step 1: Drop triggers that reference affiliate tables
DROP TRIGGER IF EXISTS on_subscription_created ON public.user_subscriptions;

-- Step 2: Drop functions related to affiliates
DROP FUNCTION IF EXISTS create_user_affiliate();
DROP FUNCTION IF EXISTS generate_affiliate_code();

-- Step 3: Drop indexes on affiliate tables
DROP INDEX IF EXISTS public.idx_affiliate_code;

-- Step 4: Drop affiliate tables (in correct order due to foreign keys)
-- Note: These tables may not exist if they were never created, so we use IF EXISTS
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_conversions CASCADE;
DROP TABLE IF EXISTS public.user_affiliates CASCADE;

-- Step 5: Remove affiliate-related columns from existing tables
-- Remove referred_by_code from user_subscriptions
ALTER TABLE public.user_subscriptions 
  DROP COLUMN IF EXISTS referred_by_code;

-- Step 6: Update user_bonuses table to remove 'affiliate_reward' from bonus_type constraint
-- First, remove any existing affiliate_reward bonuses
DELETE FROM public.user_bonuses 
WHERE bonus_type = 'affiliate_reward';

-- Then, drop and recreate the constraint without affiliate_reward
-- Note: This requires dropping the constraint first, then recreating it
ALTER TABLE public.user_bonuses 
  DROP CONSTRAINT IF EXISTS user_bonuses_bonus_type_check;

ALTER TABLE public.user_bonuses 
  ADD CONSTRAINT user_bonuses_bonus_type_check 
  CHECK (bonus_type IN ('fixed_searches', 'percentage_increase'));

-- Step 7: Verify cleanup (run these queries to confirm everything is removed)
-- Check if affiliate tables still exist
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_affiliates', 'affiliate_conversions', 'affiliate_commissions');

-- Check if referred_by_code column still exists
SELECT 
  column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_subscriptions' 
  AND column_name = 'referred_by_code';

-- Check if affiliate functions still exist
SELECT 
  routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_affiliate_code', 'create_user_affiliate');

-- Summary: All affiliate-related database structures should be removed after running this script

