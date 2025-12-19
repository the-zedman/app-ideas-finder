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
