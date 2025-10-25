-- Check current user and permissions
SELECT current_user, session_user;

-- Check if the user can see their own profile
SELECT * FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test if we can update as the authenticated user
-- This should work if RLS policies are correct
UPDATE profiles 
SET avatar_url = 'test-url'
WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6'
RETURNING id, avatar_url;
