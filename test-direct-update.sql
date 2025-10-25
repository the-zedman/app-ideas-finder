-- Test direct SQL update to see if it persists
UPDATE profiles 
SET avatar_url = 'https://stinafuifjohmyufifyp.supabase.co/storage/v1/object/public/avatars/avatars/cc23f082-f621-4f28-94fc-b1d3368574e6-1761358477059.png'
WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Check immediately after update
SELECT id, avatar_url, updated_at FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';

-- Wait a few seconds and check again
SELECT id, avatar_url, updated_at FROM profiles WHERE id = 'cc23f082-f621-4f28-94fc-b1d3368574e6';
