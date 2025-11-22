-- Email campaigns and tracking tables for App Ideas Finder

-- Email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('waitlist', 'all_users', 'subscribers', 'adhoc')),
  adhoc_emails TEXT[], -- For adhoc recipient type
  reply_to_email TEXT NOT NULL DEFAULT 'info@appideasfinder.com',
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE, -- For scheduled emails
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email recipients tracking
CREATE TABLE IF NOT EXISTS public.email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_status TEXT NOT NULL DEFAULT 'pending' CHECK (sent_status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMP WITH TIME ZONE,
  clicked_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email settings (for reply-to configuration)
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates table
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

-- Insert default email settings
INSERT INTO public.email_settings (setting_key, setting_value) VALUES
  ('reply_to_email', 'info@appideasfinder.com')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON public.email_campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_for ON public.email_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON public.email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON public.email_recipients(email);
CREATE INDEX IF NOT EXISTS idx_email_recipients_tracking_token ON public.email_recipients(tracking_token);
CREATE INDEX IF NOT EXISTS idx_email_recipients_sent_status ON public.email_recipients(sent_status);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);

-- Enable Row Level Security
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns
CREATE POLICY "Admins can view all campaigns" ON public.email_campaigns
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can insert campaigns" ON public.email_campaigns
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can update campaigns" ON public.email_campaigns
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- RLS Policies for email_recipients
CREATE POLICY "Admins can view all recipients" ON public.email_recipients
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can insert recipients" ON public.email_recipients
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can update recipients" ON public.email_recipients
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- RLS Policies for email_settings
CREATE POLICY "Admins can view settings" ON public.email_settings
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can update settings" ON public.email_settings
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- RLS Policies for email_templates
CREATE POLICY "Admins can view templates" ON public.email_templates
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can insert templates" ON public.email_templates
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can update templates" ON public.email_templates
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

CREATE POLICY "Admins can delete templates" ON public.email_templates
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

