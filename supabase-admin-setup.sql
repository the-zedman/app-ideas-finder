-- Create admins table with role-based access
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can view the admins table
CREATE POLICY "Admins can view admins table" ON public.admins
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Only super_admins can insert/update/delete admins
CREATE POLICY "Super admins can manage admins" ON public.admins
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins WHERE role = 'super_admin')
  );

-- Create user_analyses table to track all analyses
CREATE TABLE IF NOT EXISTS public.user_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  app_developer TEXT,
  app_icon_url TEXT,
  review_count INTEGER NOT NULL,
  analysis_time_seconds DECIMAL(10,2),
  api_cost DECIMAL(10,6),
  
  -- Store full analysis results as JSON
  likes JSONB,
  dislikes JSONB,
  recommendations JSONB,
  keywords JSONB,
  definitely_include JSONB,
  backlog JSONB,
  description TEXT,
  app_names JSONB,
  prp TEXT,
  similar_apps JSONB,
  pricing_model TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own analyses
CREATE POLICY "Users can view own analyses" ON public.user_analyses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses" ON public.user_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all analyses
CREATE POLICY "Admins can view all analyses" ON public.user_analyses
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Create index for faster queries
CREATE INDEX idx_user_analyses_user_id ON public.user_analyses(user_id);
CREATE INDEX idx_user_analyses_created_at ON public.user_analyses(created_at DESC);
CREATE INDEX idx_user_analyses_app_name ON public.user_analyses(app_name);

-- Insert yourself as super_admin (replace with your actual user_id)
-- To find your user_id, run: SELECT id, email FROM auth.users WHERE email = 'your@email.com';
-- Then uncomment and run:
-- INSERT INTO public.admins (user_id, role) VALUES ('YOUR-USER-ID-HERE', 'super_admin');

