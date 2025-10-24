-- Temporary fix: Disable RLS for avatars bucket to test uploads
-- This is for testing only - we'll re-enable RLS later with proper policies

-- Drop all existing policies on storage.objects for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create a simple policy that allows all operations on avatars bucket
CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'avatars');

-- Alternative: If the above doesn't work, try this more permissive approach
-- CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects
--   FOR ALL WITH CHECK (bucket_id = 'avatars');
