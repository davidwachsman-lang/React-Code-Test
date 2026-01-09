-- Add missing columns to jobs table for storm intake form
-- Run this script in your Supabase SQL Editor if you get column not found errors

-- Add boardup_needed column if it doesn't exist
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS boardup_needed BOOLEAN DEFAULT false;

-- Add basement_type column if it doesn't exist
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS basement_type VARCHAR(20);

-- Add any other potentially missing columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS tarping_needed BOOLEAN DEFAULT false;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS rooms_affected INTEGER;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS foundation_type VARCHAR(20);

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS units_affected INTEGER;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS floors_affected INTEGER;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS parking_location TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS msa_on_file BOOLEAN DEFAULT false;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS cause_of_loss TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS cause_fixed BOOLEAN DEFAULT false;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS sqft_affected INTEGER;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS power_at_location VARCHAR(10);

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS onsite_contact_name TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS onsite_contact_phone TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS deposit_explained BOOLEAN DEFAULT false;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS insurance_provider TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS insurance_claim_number TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) DEFAULT 'residential';

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS property_reference VARCHAR(50);

-- Add comments
COMMENT ON COLUMN jobs.boardup_needed IS 'Whether board-up is needed';
COMMENT ON COLUMN jobs.basement_type IS 'Basement type: finished, unfinished, or none (residential only)';
COMMENT ON COLUMN jobs.tarping_needed IS 'Whether tarping is needed';
