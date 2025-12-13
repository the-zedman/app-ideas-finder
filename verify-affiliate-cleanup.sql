-- Verification script to confirm all affiliate structures have been removed
-- Run this in Supabase SQL Editor after running remove-affiliate-database.sql

-- ============================================
-- 1. Check for Affiliate Tables
-- ============================================
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No affiliate tables found'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' affiliate table(s)'
  END as result,
  string_agg(table_name, ', ') as details
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_affiliates', 'affiliate_conversions', 'affiliate_commissions');

-- ============================================
-- 2. Check for Affiliate Columns
-- ============================================
SELECT 
  'Columns Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No affiliate columns found'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' affiliate column(s)'
  END as result,
  string_agg(table_name || '.' || column_name, ', ') as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (
    (table_name = 'user_subscriptions' AND column_name = 'referred_by_code')
    OR (table_name = 'user_bonuses' AND column_name LIKE '%affiliate%')
  );

-- ============================================
-- 3. Check for Affiliate Functions
-- ============================================
SELECT 
  'Functions Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No affiliate functions found'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' affiliate function(s)'
  END as result,
  string_agg(routine_name, ', ') as details
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_affiliate_code', 'create_user_affiliate');

-- ============================================
-- 4. Check for Affiliate Triggers
-- ============================================
SELECT 
  'Triggers Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No affiliate triggers found'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' affiliate trigger(s)'
  END as result,
  string_agg(trigger_name, ', ') as details
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name = 'on_subscription_created';

-- ============================================
-- 5. Check for Affiliate Indexes
-- ============================================
SELECT 
  'Indexes Check' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No affiliate indexes found'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' affiliate index(es)'
  END as result,
  string_agg(indexname, ', ') as details
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname = 'idx_affiliate_code';

-- ============================================
-- 6. Check user_bonuses Constraint
-- ============================================
SELECT 
  'Constraint Check' as check_type,
  CASE 
    WHEN constraint_definition LIKE '%affiliate_reward%' THEN '❌ FAIL: affiliate_reward still in constraint'
    ELSE '✅ PASS: affiliate_reward removed from constraint'
  END as result,
  constraint_definition as details
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'user_bonuses'
  AND tc.constraint_type = 'CHECK'
  AND cc.constraint_name LIKE '%bonus_type%';

-- ============================================
-- 7. Summary - All Checks
-- ============================================
SELECT 
  'SUMMARY' as check_type,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_affiliates', 'affiliate_conversions', 'affiliate_commissions')) = 0
      AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'user_subscriptions' AND column_name = 'referred_by_code') OR (table_name = 'user_bonuses' AND column_name LIKE '%affiliate%'))) = 0
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('generate_affiliate_code', 'create_user_affiliate')) = 0
      AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name = 'on_subscription_created') = 0
      AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_affiliate_code') = 0
    ) THEN '✅ ALL CLEAN: All affiliate structures successfully removed!'
    ELSE '❌ INCOMPLETE: Some affiliate structures may still exist. Review individual checks above.'
  END as result,
  'Review individual check results above for details' as details;

