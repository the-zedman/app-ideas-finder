-- Test if we can update the profile as the postgres role (bypasses RLS)
-- This should work since we're running as postgres

-- First, let's see what the current value is
SELECT id, avatar_url, updated_at FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Update as postgres (bypasses RLS)
UPDATE profiles 
SET avatar_url = 'https://stinafuifjohmyufifyp.supabase.co/storage/v1/object/public/avatars/avatars/cc23f082-f621-4f28-94fc-b1d3368574e6-1761358477059.png'
WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Check if it worked
SELECT id, avatar_url, updated_at FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';
