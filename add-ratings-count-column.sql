-- Add ratings_count column to user_analyses table
ALTER TABLE public.user_analyses
ADD COLUMN IF NOT EXISTS ratings_count INTEGER DEFAULT 0;

-- Add index for performance when sorting by ratings
CREATE INDEX IF NOT EXISTS idx_user_analyses_ratings_count ON public.user_analyses (ratings_count);

-- Update existing rows to set ratings_count to 0 where NULL
UPDATE public.user_analyses
SET ratings_count = 0
WHERE ratings_count IS NULL;

-- Add comment
COMMENT ON COLUMN public.user_analyses.ratings_count IS 'Total number of ratings the app has received (from App Store userRatingCount)';

