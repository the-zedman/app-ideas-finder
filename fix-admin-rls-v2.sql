-- COMPREHENSIVE FIX for infinite recursion in RLS policies
-- This version completely removes all problematic policies and rebuilds them correctly

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================================

-- Drop all policies on admins table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'admins') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admins', r.policyname);
    END LOOP;
END $$;

-- Drop all policies on user_analyses table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_analyses') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_analyses', r.policyname);
    END LOOP;
END $$;

-- Drop all policies on user_affiliates table  
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_affiliates') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_affiliates', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: CREATE SAFE POLICIES ON ADMINS TABLE
-- ============================================================================

-- CRITICAL: This policy must NOT reference the admins table in its check
-- It only checks if the authenticated user ID matches the row's user_id
CREATE POLICY "allow_users_read_own_admin_record" ON public.admins
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Super admins can manage admins (but this creates recursion, so we disable it)
-- Instead, we'll use service role for admin management via API routes
-- CREATE POLICY "super_admins_manage_admins" ON public.admins
--   FOR ALL 
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.admins 
--       WHERE user_id = auth.uid() AND role = 'super_admin'
--     )
--   );

-- ============================================================================
-- STEP 3: CREATE SAFE POLICIES ON USER_ANALYSES TABLE
-- ============================================================================

-- Users can view their own analyses
CREATE POLICY "allow_users_read_own_analyses" ON public.user_analyses
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "allow_users_insert_own_analyses" ON public.user_analyses
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "allow_users_update_own_analyses" ON public.user_analyses
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "allow_users_delete_own_analyses" ON public.user_analyses
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Admins can view all analyses (using simple admin check)
CREATE POLICY "allow_admins_read_all_analyses" ON public.user_analyses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: CREATE SAFE POLICIES ON USER_AFFILIATES TABLE
-- ============================================================================

-- Users can view their own affiliate data
CREATE POLICY "allow_users_read_own_affiliates" ON public.user_affiliates
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can update their own affiliate data
CREATE POLICY "allow_users_update_own_affiliates" ON public.user_affiliates
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can view all affiliate data (using simple admin check)
CREATE POLICY "allow_admins_read_all_affiliates" ON public.user_affiliates
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Check that policies were created
-- ============================================================================

SELECT 'Policies on admins table:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'admins';

SELECT 'Policies on user_analyses table:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_analyses';

SELECT 'Policies on user_affiliates table:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_affiliates';

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. The key fix is that the "allow_users_read_own_admin_record" policy on 
--    admins table does NOT reference admins table in its condition
-- 2. All other tables that need to check admin status use EXISTS with a 
--    simple subquery that only matches against auth.uid()
-- 3. This works because when the subquery runs, it triggers RLS on admins,
--    which only checks auth.uid() = user_id (no recursion!)
-- 4. Admin management (insert/update/delete on admins) is done via service
--    role in API routes, which bypasses RLS entirely
-- ============================================================================

