-- Check current RLS status on profiles table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check all RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check current profiles data
SELECT id, first_name, last_name, username, avatar_url, updated_at 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 5;

-- Check if there are any constraints or triggers
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' AND table_schema = 'public';
