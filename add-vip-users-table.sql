-- VIP Users Table (similar structure to waitlist)
CREATE TABLE IF NOT EXISTS public.vip_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribe_token TEXT DEFAULT gen_random_uuid()::TEXT,
  notes TEXT,
  invited_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired')),
  bonus_granted_at TIMESTAMPTZ,
  bonus_granted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bonus_code TEXT,
  bonus_notes TEXT
);

-- Enable RLS
ALTER TABLE public.vip_users ENABLE ROW LEVEL SECURITY;

-- Admin policy for VIP users management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vip_users'
      AND policyname = 'Admins can manage all VIP users'
  ) THEN
    CREATE POLICY "Admins can manage all VIP users"
      ON public.vip_users
      FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM public.admins));
  END IF;
END $$;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_vip_users_email ON public.vip_users(email);
CREATE INDEX IF NOT EXISTS idx_vip_users_status ON public.vip_users(status);

