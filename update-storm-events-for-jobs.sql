-- Update storm_events table to add missing columns for Storm Jobs management
-- Run this in your Supabase SQL Editor

-- Add affected_zip_codes column (array of zip codes)
ALTER TABLE storm_events
ADD COLUMN IF NOT EXISTS affected_zip_codes TEXT[];

-- Add name column (if it doesn't already exist, event_name already exists)
-- Note: event_name already exists, so we'll add name as an alias/computed column or use event_name
-- For consistency, we'll add a name column that can be used if needed
-- In practice, event_name can serve as the name field
ALTER TABLE storm_events
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index on affected_zip_codes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_storm_events_affected_zip_codes 
ON storm_events USING GIN(affected_zip_codes);

-- Add comments
COMMENT ON COLUMN storm_events.affected_zip_codes IS 'Array of zip codes impacted by the storm event';
COMMENT ON COLUMN storm_events.name IS 'Event name (alias for event_name, can be used for alternate naming)';
