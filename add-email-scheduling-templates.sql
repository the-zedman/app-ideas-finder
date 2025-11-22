-- Add scheduling and template support to email system

-- Add scheduled_for column to email_campaigns
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Update status enum to include 'scheduled' and 'cancelled'
ALTER TABLE public.email_campaigns
DROP CONSTRAINT IF EXISTS email_campaigns_status_check;

ALTER TABLE public.email_campaigns
ADD CONSTRAINT email_campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'));

-- Create index for scheduled emails
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_for ON public.email_campaigns(scheduled_for);

-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);

-- Enable RLS on templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "Admins can view templates" ON public.email_templates;
CREATE POLICY "Admins can view templates" ON public.email_templates
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

DROP POLICY IF EXISTS "Admins can insert templates" ON public.email_templates;
CREATE POLICY "Admins can insert templates" ON public.email_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

DROP POLICY IF EXISTS "Admins can update templates" ON public.email_templates;
CREATE POLICY "Admins can update templates" ON public.email_templates
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;
CREATE POLICY "Admins can delete templates" ON public.email_templates
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

