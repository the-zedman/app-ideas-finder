-- Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check if RLS is enabled on profiles table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Test if we can update the profile directly
UPDATE profiles 
SET avatar_url = 'https://stinafuifjohmyufifyp.supabase.co/storage/v1/object/public/avatars/avatars/cc23f082-f621-4f28-94fc-b1d3368574e6-1761357679577.jpg'
WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6'
RETURNING *;
