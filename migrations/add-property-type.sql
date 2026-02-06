-- Add property_type column to jobs table
-- Run this in your Supabase SQL Editor

-- Add property_type column
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('Residential', 'Commercial'));

-- Add comment
COMMENT ON COLUMN jobs.property_type IS 'Property type: Residential or Commercial';

-- Optional: Set default for existing Large Loss and Referral jobs
UPDATE jobs
SET property_type = 'Commercial'
WHERE division IN ('Large Loss', 'Referral') AND property_type IS NULL;
