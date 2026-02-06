-- Enhance jobs table with storm-specific fields for Storm Jobs management
-- Run this in your Supabase SQL Editor

-- Add damage_types array column
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS damage_types TEXT[];

-- Add inspection_date column (separate from date_inspected for storm-specific tracking)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS inspection_date DATE;

-- Add inspector_id column (foreign key to users table - assuming users table exists)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS inspector_id UUID;

-- Add inspection_completed boolean flag
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS inspection_completed BOOLEAN DEFAULT false;

-- Add insurance_carrier column (may alias existing insurance_company)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS insurance_carrier TEXT;

-- Add property_reference column for auto-generated references (SE-001, SE-002, etc.)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS property_reference VARCHAR(50);

-- Create unique index on property_reference to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_property_reference_unique 
ON jobs(property_reference) 
WHERE property_reference IS NOT NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_damage_types 
ON jobs USING GIN(damage_types);
CREATE INDEX IF NOT EXISTS idx_jobs_inspection_date ON jobs(inspection_date);
CREATE INDEX IF NOT EXISTS idx_jobs_inspector_id ON jobs(inspector_id);
CREATE INDEX IF NOT EXISTS idx_jobs_inspection_completed ON jobs(inspection_completed);
CREATE INDEX IF NOT EXISTS idx_jobs_insurance_carrier ON jobs(insurance_carrier);
CREATE INDEX IF NOT EXISTS idx_jobs_property_reference ON jobs(property_reference);

-- Add comments
COMMENT ON COLUMN jobs.damage_types IS 'Array of damage types (wind, hail, flood, etc.)';
COMMENT ON COLUMN jobs.inspection_date IS 'Scheduled/completed inspection date for storm jobs';
COMMENT ON COLUMN jobs.inspector_id IS 'Foreign key to users table for assigned inspector';
COMMENT ON COLUMN jobs.inspection_completed IS 'Flag indicating if inspection is completed';
COMMENT ON COLUMN jobs.insurance_carrier IS 'Insurance company name (for storm jobs)';
COMMENT ON COLUMN jobs.property_reference IS 'Auto-generated reference number (SE-001, SE-002, etc.)';

-- Note: Priority and Status extensions
-- Priority: Currently supports 'high', 'normal', 'low'. Extended to support 'emergency', 'high', 'medium', 'low'
-- Status: Currently supports 'pending', 'wip', 'ready_to_bill', 'ar', 'complete', 'closed'
-- Extended to support: 'lead', 'inspection_scheduled', 'inspected', 'pending_crew', 'in_progress'
-- These are handled at the application level, but if you want database constraints, you would update the check constraint here

-- Add status column if it doesn't exist
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Update status check constraint to include storm-specific statuses
-- First drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_status_check'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
  END IF;
END $$;

-- Add the new constraint with extended status values
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'pending', 'wip', 'ready_to_bill', 'ar', 'complete', 'closed',
    'lead', 'inspection_scheduled', 'inspected', 'pending_crew', 'in_progress'
  ) OR status IS NULL);

-- Add priority column if it doesn't exist
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS priority VARCHAR(20);

-- Update priority check constraint to include emergency and medium
-- First drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_priority_check'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_priority_check;
  END IF;
END $$;

-- Add the new constraint with extended priority values
ALTER TABLE jobs ADD CONSTRAINT jobs_priority_check
  CHECK (priority IN ('emergency', 'high', 'medium', 'low', 'normal') OR priority IS NULL);
