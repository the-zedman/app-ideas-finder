-- Temporarily disable RLS on profiles table for testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Test update
UPDATE profiles 
SET avatar_url = 'https://stinafuifjohmyufifyp.supabase.co/storage/v1/object/public/avatars/avatars/cc23f082-f621-4f28-94fc-b1d3368574e6-1761357679577.jpg'
WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Check the result
SELECT id, avatar_url FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Re-enable RLS (run this after testing)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
