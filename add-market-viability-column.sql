-- Add market_viability column to user_analyses table
-- This stores the comprehensive business opportunity analysis

ALTER TABLE public.user_analyses 
ADD COLUMN IF NOT EXISTS market_viability TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_analyses.market_viability IS 'Comprehensive market viability analysis including TAM/SAM/SOM, competitive analysis, revenue projections, risk assessment, and go-to-market strategy';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_analyses' 
AND column_name = 'market_viability';

