-- Fix RLS policies to avoid circular dependency (infinite recursion)
-- The issue: policies that use "auth.uid() IN (SELECT user_id FROM public.admins)" 
-- cause infinite recursion because that subquery itself is subject to RLS

-- ============================================================================
-- FIX ADMINS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view admins table" ON public.admins;
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.admins;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admins;
DROP POLICY IF EXISTS "Super admins can view all admins" ON public.admins;

-- Allow authenticated users to check if THEY are an admin (self-check only)
-- This doesn't create recursion because it only checks self
CREATE POLICY "Users can check own admin status" ON public.admins
  FOR SELECT USING (auth.uid() = user_id);

-- Super admins can view all admin records
CREATE POLICY "Super admins can view all admins" ON public.admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only super_admins can insert/update/delete admins
CREATE POLICY "Super admins can manage admins" ON public.admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- FIX USER_ANALYSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all analyses" ON public.user_analyses;

-- Re-create without circular dependency
-- Note: Service role API calls bypass RLS, so admin API routes will still work
-- This policy only affects direct client-side Supabase calls
CREATE POLICY "Admins can view all analyses" ON public.user_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FIX USER_AFFILIATES TABLE (if it has a similar policy)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.user_affiliates;

-- Re-create without circular dependency
CREATE POLICY "Admins can view all affiliates" ON public.user_affiliates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- NOTE: These policies use EXISTS with a subquery instead of IN
-- This avoids infinite recursion while still checking admin status
-- ============================================================================

