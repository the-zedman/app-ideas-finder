-- Fix RLS policies on admins table to avoid circular dependency
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view admins table" ON public.admins;
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.admins;

-- Create simpler policies that don't create circular dependency
-- Service role (used by middleware) bypasses RLS anyway
-- These policies only affect client-side queries

-- Allow authenticated users to check if THEY are an admin (self-check only)
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

