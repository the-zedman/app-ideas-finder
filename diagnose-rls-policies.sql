-- Diagnostic script to check all RLS policies on key tables
-- Run this in Supabase SQL Editor to see what policies currently exist

-- Check policies on admins table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'admins'
ORDER BY policyname;

-- Check policies on user_analyses table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_analyses'
ORDER BY policyname;

-- Check policies on user_affiliates table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_affiliates'
ORDER BY policyname;

