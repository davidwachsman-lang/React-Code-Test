-- Add association_membership column to crm_records table if it doesn't exist
-- Run this in your Supabase SQL Editor

ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS association_membership TEXT;

-- Add comment to document the column
COMMENT ON COLUMN crm_records.association_membership IS 'Association membership information for commercial prospects';

