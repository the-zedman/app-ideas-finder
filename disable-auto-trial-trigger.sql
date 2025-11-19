-- Disable auto-trial trigger so users must purchase before getting a subscription
-- This ensures the subscription flag-based access control works correctly

-- Drop the trigger that auto-creates trial subscriptions on user signup
DROP TRIGGER IF EXISTS on_user_created_subscription ON auth.users;

-- Optionally, we can also drop the function if it's no longer needed
-- But keeping it in case we want to re-enable it later
-- DROP FUNCTION IF EXISTS initialize_user_subscription();

