-- Add basement_type column to jobs table if it doesn't exist
-- Run this in your Supabase SQL Editor

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS basement_type VARCHAR(20);

-- Add comment
COMMENT ON COLUMN jobs.basement_type IS 'Basement type: finished, unfinished, or none (residential only)';
