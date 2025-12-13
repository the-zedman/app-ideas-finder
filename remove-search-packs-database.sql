-- Remove search_packs table from database
-- Run this in Supabase SQL Editor to clean up search pack structures

-- Drop the search_packs table
DROP TABLE IF EXISTS public.search_packs CASCADE;

-- Verify removal
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'search_packs';

-- If the query returns no rows, the table has been successfully removed

