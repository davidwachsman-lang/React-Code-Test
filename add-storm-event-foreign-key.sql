-- Ensure foreign key relationship exists between jobs and storm_events
-- Run this in your Supabase SQL Editor if the relationship is not working

-- First, check if storm_event_id column exists, if not add it
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS storm_event_id UUID;

-- Drop existing foreign key constraint if it exists (to recreate it)
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS fk_jobs_storm_event;

-- Add the foreign key constraint
ALTER TABLE jobs
ADD CONSTRAINT fk_jobs_storm_event
FOREIGN KEY (storm_event_id)
REFERENCES storm_events(id)
ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_storm_event_id ON jobs(storm_event_id);

-- Add comment
COMMENT ON COLUMN jobs.storm_event_id IS 'Foreign key to storm_events table, linking a job to a specific storm event';
