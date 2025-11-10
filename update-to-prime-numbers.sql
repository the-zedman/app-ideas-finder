-- Update Core and Prime plans to use prime numbers (Easter egg!)
-- Core: 75 → 73 searches
-- Prime: 225 → 227 searches

UPDATE public.subscription_plans
SET searches_per_month = 73
WHERE id IN ('core_monthly', 'core_annual');

UPDATE public.subscription_plans
SET searches_per_month = 227
WHERE id IN ('prime_monthly', 'prime_annual');

-- Verify the changes
SELECT id, name, searches_per_month, price_monthly, price_annual
FROM public.subscription_plans
ORDER BY 
  CASE 
    WHEN id = 'trial' THEN 1
    WHEN id LIKE 'core%' THEN 2
    WHEN id LIKE 'prime%' THEN 3
    ELSE 4
  END;

