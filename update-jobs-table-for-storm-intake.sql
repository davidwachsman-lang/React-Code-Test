-- Add columns to jobs table for storm intake form
-- Run this script in Supabase SQL Editor

-- Add storm_event_id foreign key to link jobs to storm events
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS storm_event_id UUID REFERENCES storm_events(id) ON DELETE SET NULL;

-- Add property type and related fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) DEFAULT 'residential';

-- Commercial-specific fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS msa_on_file BOOLEAN DEFAULT false;

-- Residential-specific fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS rooms_affected INTEGER;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS foundation_type VARCHAR(20);
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS basement_type VARCHAR(20);

-- Commercial-specific fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS units_affected INTEGER;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS floors_affected INTEGER;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS parking_location TEXT;

-- Property information fields (shared)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS cause_of_loss TEXT;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS cause_fixed BOOLEAN DEFAULT false;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS sqft_affected INTEGER;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS power_at_location VARCHAR(10);
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS tarping_needed BOOLEAN DEFAULT false;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS boardup_needed BOOLEAN DEFAULT false;

-- Onsite contact fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS onsite_contact_name TEXT;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS onsite_contact_phone TEXT;

-- Payment method fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS deposit_explained BOOLEAN DEFAULT false;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS insurance_claim_number TEXT;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_storm_event_id ON jobs(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_jobs_property_type ON jobs(property_type);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_method ON jobs(payment_method);

-- Add comments
COMMENT ON COLUMN jobs.storm_event_id IS 'Links job to a specific storm event';
COMMENT ON COLUMN jobs.property_type IS 'Type of property: residential or commercial';
COMMENT ON COLUMN jobs.msa_on_file IS 'Whether MSA is on file (commercial only)';
COMMENT ON COLUMN jobs.rooms_affected IS 'Number of rooms affected (residential only)';
COMMENT ON COLUMN jobs.foundation_type IS 'Foundation type: crawlspace or slab (residential only)';
COMMENT ON COLUMN jobs.basement_type IS 'Basement type: finished, unfinished, or none (residential only)';
COMMENT ON COLUMN jobs.units_affected IS 'Number of units affected (commercial only)';
COMMENT ON COLUMN jobs.floors_affected IS 'Number of floors affected (commercial only)';
COMMENT ON COLUMN jobs.parking_location IS 'Parking location for crew (commercial only)';
COMMENT ON COLUMN jobs.cause_of_loss IS 'Cause of loss/damage';
COMMENT ON COLUMN jobs.cause_fixed IS 'Whether the cause has been fixed';
COMMENT ON COLUMN jobs.sqft_affected IS 'Square footage affected';
COMMENT ON COLUMN jobs.power_at_location IS 'Power status: on or off';
COMMENT ON COLUMN jobs.tarping_needed IS 'Whether tarping is needed';
COMMENT ON COLUMN jobs.boardup_needed IS 'Whether board-up is needed';
COMMENT ON COLUMN jobs.onsite_contact_name IS 'Onsite point-of-contact name';
COMMENT ON COLUMN jobs.onsite_contact_phone IS 'Onsite point-of-contact phone';
COMMENT ON COLUMN jobs.payment_method IS 'Payment method: insurance, self_pay, or quote_request';
COMMENT ON COLUMN jobs.deposit_explained IS 'Whether 50% deposit requirement was explained (self-pay only)';
COMMENT ON COLUMN jobs.insurance_provider IS 'Insurance provider name (insurance payment method only)';
COMMENT ON COLUMN jobs.insurance_claim_number IS 'Insurance claim number (insurance payment method only)';
