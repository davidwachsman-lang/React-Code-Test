-- Add notes column to top_targets table
ALTER TABLE top_targets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN top_targets.notes IS 'Notes for the target company';

