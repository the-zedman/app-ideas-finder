-- Check the current state of the profiles table
SELECT id, first_name, last_name, username, avatar_url, updated_at 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 5;

-- Check if there are any profiles with avatar_url
SELECT COUNT(*) as profiles_with_avatars 
FROM profiles 
WHERE avatar_url IS NOT NULL AND avatar_url != '';

-- Check the most recent profile updates
SELECT id, avatar_url, updated_at 
FROM profiles 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
