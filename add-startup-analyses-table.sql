-- Startup analyses table for business idea analysis
CREATE TABLE IF NOT EXISTS public.startup_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  business_idea TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Analysis results (same structure as user_analyses)
  likes JSONB,
  dislikes JSONB,
  recommendations JSONB,
  keywords JSONB,
  definitely_include JSONB,
  backlog JSONB,
  description TEXT,
  app_names JSONB,
  prp TEXT,
  competitors JSONB, -- Changed from similar_apps
  pricing_model TEXT,
  market_viability TEXT,
  
  -- Metadata
  analysis_time_seconds DECIMAL(10,2),
  api_cost DECIMAL(10,6),
  share_slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.startup_analyses ENABLE ROW LEVEL SECURITY;

-- Only admins can view all startup analyses
CREATE POLICY "Admins can view all startup analyses" ON public.startup_analyses
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Public can view startup analyses by share_slug (for public sharing)
CREATE POLICY "Public can view shared startup analyses" ON public.startup_analyses
  FOR SELECT USING (
    share_slug IS NOT NULL
  );

-- Only admins can insert startup analyses
CREATE POLICY "Admins can insert startup analyses" ON public.startup_analyses
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Only admins can update startup analyses
CREATE POLICY "Admins can update startup analyses" ON public.startup_analyses
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Only admins can delete startup analyses
CREATE POLICY "Admins can delete startup analyses" ON public.startup_analyses
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_startup_analyses_created_by ON public.startup_analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_startup_analyses_created_at ON public.startup_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_analyses_share_slug ON public.startup_analyses(share_slug);

-- Add share_slug generation function (reuse from shared-app-links if exists, otherwise create)
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_startup_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS on_startup_analyses_updated ON public.startup_analyses;
CREATE TRIGGER on_startup_analyses_updated
  BEFORE UPDATE ON public.startup_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_startup_analyses_updated_at();
