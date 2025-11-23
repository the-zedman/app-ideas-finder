-- Migration script to create affiliate records for existing users who don't have one
-- This ensures all users (including waitlist users) have affiliate records

-- Create affiliate records for all users who don't have one
INSERT INTO public.user_affiliates (
  user_id,
  affiliate_code,
  total_referrals,
  paying_referrals,
  total_bonuses_earned
)
SELECT 
  au.id as user_id,
  upper(substring(md5(random()::text || au.id::text || random()::text) from 1 for 8)) as affiliate_code,
  0 as total_referrals,
  0 as paying_referrals,
  0 as total_bonuses_earned
FROM auth.users au
LEFT JOIN public.user_affiliates ua ON au.id = ua.user_id
WHERE ua.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Ensure all codes are unique (handle any collisions)
-- If there are any duplicate codes, regenerate them
DO $$
DECLARE
  duplicate_code TEXT;
  new_code TEXT;
  user_id_var UUID;
BEGIN
  -- Find and fix any duplicate codes
  FOR duplicate_code IN 
    SELECT affiliate_code 
    FROM public.user_affiliates 
    GROUP BY affiliate_code 
    HAVING COUNT(*) > 1
  LOOP
    -- Get all user_ids with this duplicate code (except the first one)
    FOR user_id_var IN 
      SELECT ua.user_id 
      FROM public.user_affiliates ua 
      WHERE ua.affiliate_code = duplicate_code 
      ORDER BY ua.created_at 
      OFFSET 1
    LOOP
      -- Generate a new unique code
      LOOP
        new_code := upper(substring(md5(random()::text || user_id_var::text || random()::text) from 1 for 8));
        -- Check if this code already exists
        IF NOT EXISTS (SELECT 1 FROM public.user_affiliates WHERE affiliate_code = new_code) THEN
          -- Update with new code
          UPDATE public.user_affiliates 
          SET affiliate_code = new_code 
          WHERE user_id = user_id_var;
          EXIT;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Verification query - run this to check results
SELECT 
  au.email,
  au.created_at as user_created_at,
  ua.affiliate_code,
  ua.created_at as affiliate_created_at,
  CASE 
    WHEN ua.user_id IS NULL THEN 'MISSING'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN public.user_affiliates ua ON au.id = ua.user_id
ORDER BY au.created_at DESC;

-- Summary statistics
SELECT 
  COUNT(*) as total_users,
  COUNT(ua.user_id) as users_with_affiliate,
  COUNT(*) - COUNT(ua.user_id) as users_without_affiliate
FROM auth.users au
LEFT JOIN public.user_affiliates ua ON au.id = ua.user_id;

