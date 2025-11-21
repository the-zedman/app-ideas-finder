CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  page_url TEXT,
  allow_contact BOOLEAN DEFAULT true,
  reward_granted BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_feedback'
      AND policyname = 'Users can insert their own feedback'
  ) THEN
    CREATE POLICY "Users can insert their own feedback"
      ON public.user_feedback
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_feedback'
      AND policyname = 'Users can view their own feedback'
  ) THEN
    CREATE POLICY "Users can view their own feedback"
      ON public.user_feedback
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_feedback'
      AND policyname = 'Admins can manage all feedback'
  ) THEN
    CREATE POLICY "Admins can manage all feedback"
      ON public.user_feedback
      FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM public.admins));
  END IF;
END $$;

