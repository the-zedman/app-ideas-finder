-- Add archived column to user_feedback table
ALTER TABLE public.user_feedback 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_archived ON public.user_feedback(archived);

