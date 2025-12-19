-- Add share_slug column to existing startup_analyses table
-- Run this if the table was created before share_slug was added

-- Add share_slug column if it doesn't exist
ALTER TABLE public.startup_analyses
  ADD COLUMN IF NOT EXISTS share_slug TEXT;

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'startup_analyses_share_slug_key'
  ) THEN
    ALTER TABLE public.startup_analyses
      ADD CONSTRAINT startup_analyses_share_slug_key UNIQUE (share_slug);
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_startup_analyses_share_slug ON public.startup_analyses(share_slug);

-- Create share_slug generation function if it doesn't exist
CREATE OR REPLACE FUNCTION public.generate_startup_share_slug(slug_length INTEGER DEFAULT 8)
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

    -- Ensure slug is unique across both tables
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.startup_analyses WHERE share_slug = result
      UNION ALL
      SELECT 1 FROM public.user_analyses WHERE share_slug = result
    );
  END LOOP;

  RETURN result;
END;
$$;

-- Set default generator for share_slug
ALTER TABLE public.startup_analyses
  ALTER COLUMN share_slug SET DEFAULT public.generate_startup_share_slug();

-- Backfill existing rows without a slug
UPDATE public.startup_analyses
SET share_slug = public.generate_startup_share_slug()
WHERE share_slug IS NULL;

-- Update the public read policy to include share_slug check
DROP POLICY IF EXISTS "Public can view shared startup analyses" ON public.startup_analyses;
CREATE POLICY "Public can view shared startup analyses" ON public.startup_analyses
  FOR SELECT USING (
    share_slug IS NOT NULL
  );
