-- Shared App Links & Slug Support
-- --------------------------------
-- 1. Adds a short, unique slug to every analysis so it can be shared publicly.
-- 2. Backfills slugs for existing analyses and enforces uniqueness.
-- 3. Provides a helper function for fetching the most recent analysis per app.

-- Ensure pgcrypto exists for gen_random_bytes (usually enabled, but safe guard)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add the share_slug column if it is missing
ALTER TABLE public.user_analyses
  ADD COLUMN IF NOT EXISTS share_slug TEXT;

-- Step 2: Function to generate short, URL-safe slugs (avoids similar looking chars)
CREATE OR REPLACE FUNCTION public.generate_share_slug(slug_length INTEGER DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  result TEXT := '';
  i INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..slug_length LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;

    -- Ensure slug is unique before returning
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_analyses WHERE share_slug = result
    );
  END LOOP;

  RETURN result;
END;
$$;

-- Step 3: Set default generator for all future rows
ALTER TABLE public.user_analyses
  ALTER COLUMN share_slug SET DEFAULT public.generate_share_slug();

-- Step 4: Backfill existing rows without a slug
UPDATE public.user_analyses
SET share_slug = public.generate_share_slug()
WHERE share_slug IS NULL;

-- Step 5: Enforce constraints for uniqueness and presence
ALTER TABLE public.user_analyses
  ALTER COLUMN share_slug SET NOT NULL;

ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_share_slug_unique UNIQUE (share_slug);

CREATE INDEX IF NOT EXISTS idx_user_analyses_share_slug ON public.user_analyses (share_slug);

-- Step 6: Helper function to fetch the most recent analysis per unique app
CREATE OR REPLACE FUNCTION public.get_latest_shared_apps(limit_count INTEGER DEFAULT NULL)
RETURNS TABLE (
  analysis_id UUID,
  app_id TEXT,
  app_name TEXT,
  app_developer TEXT,
  app_icon_url TEXT,
  review_count INTEGER,
  ratings_count INTEGER,
  created_at TIMESTAMPTZ,
  share_slug TEXT
) AS $$
  SELECT
    ua.id AS analysis_id,
    ua.app_id,
    ua.app_name,
    ua.app_developer,
    ua.app_icon_url,
    ua.review_count,
    ua.ratings_count,
    ua.created_at,
    ua.share_slug
  FROM (
    SELECT DISTINCT ON (app_id) *
    FROM public.user_analyses
    ORDER BY app_id, created_at DESC
  ) ua
  ORDER BY ua.created_at DESC
  LIMIT COALESCE(limit_count, 1000);
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_latest_shared_apps(INTEGER) TO authenticated, service_role;

