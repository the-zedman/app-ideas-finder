-- Check if there are any constraints specifically on avatar_url field
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name = 'avatar_url';

-- Check if there are any triggers that might affect avatar_url updates
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';

-- Test a direct update to avatar_url field
UPDATE profiles 
SET avatar_url = 'test-direct-avatar-update'
WHERE id = 'd821d87c-71d4-44f2-8f59-f102019cff95';

-- Check if it worked
SELECT id, avatar_url FROM profiles WHERE id = 'd821d87c-71d4-44f2-8f59-f102019cff95';
