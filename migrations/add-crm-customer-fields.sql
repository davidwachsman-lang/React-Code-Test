-- Add CRM data points to customers table in Supabase
-- Run this in your Supabase SQL Editor

-- Add new CRM fields
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS date_closed_committed DATE,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS onsite_address TEXT,
ADD COLUMN IF NOT EXISTS referral_date DATE,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS last_face_to_face_date DATE;

-- Add comments to document the new columns
COMMENT ON COLUMN customers.date_closed_committed IS 'Date the customer was closed/committed';
COMMENT ON COLUMN customers.company_name IS 'Company name for the customer';
COMMENT ON COLUMN customers.contact_name IS 'Primary contact name';
COMMENT ON COLUMN customers.onsite_address IS 'Onsite address (may differ from billing address)';
COMMENT ON COLUMN customers.referral_date IS 'Date when customer first referred a job (for calculating days since referral)';
COMMENT ON COLUMN customers.last_activity_date IS 'Date of last activity (for calculating days since last activity)';
COMMENT ON COLUMN customers.last_face_to_face_date IS 'Date of last face-to-face meeting (for calculating days since last face-to-face)';

-- Note: Jobs Referred (Count) and Job Revenue ($) will be calculated from the jobs table
-- These can be computed via a view or calculated in the application

