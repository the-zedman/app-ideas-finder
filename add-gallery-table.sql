-- Gallery table for showcasing apps created using App Ideas Finder
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL,
  app_url TEXT NOT NULL,
  app_icon_url TEXT,
  screenshot_url TEXT,
  description TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Public can view gallery items
CREATE POLICY "Public can view gallery items" ON public.gallery
  FOR SELECT USING (true);

-- Only admins can insert/update/delete gallery items
CREATE POLICY "Admins can manage gallery items" ON public.gallery
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- Create index for display order
CREATE INDEX IF NOT EXISTS idx_gallery_display_order ON public.gallery(display_order DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_featured ON public.gallery(is_featured) WHERE is_featured = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS on_gallery_updated ON public.gallery;
CREATE TRIGGER on_gallery_updated
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW EXECUTE FUNCTION public.update_gallery_updated_at();

