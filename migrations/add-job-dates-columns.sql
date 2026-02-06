-- Add key date columns and team member columns to jobs table in Supabase
-- Run this in your Supabase SQL Editor

-- Add date columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS date_received DATE,
ADD COLUMN IF NOT EXISTS date_started DATE,
ADD COLUMN IF NOT EXISTS date_inspected DATE,
ADD COLUMN IF NOT EXISTS estimate_sent_date DATE,
ADD COLUMN IF NOT EXISTS date_majority_completion DATE,
ADD COLUMN IF NOT EXISTS date_invoiced DATE,
ADD COLUMN IF NOT EXISTS date_paid DATE,
ADD COLUMN IF NOT EXISTS date_closed DATE;

-- Add team member columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS pm TEXT,
ADD COLUMN IF NOT EXISTS jfc TEXT,
ADD COLUMN IF NOT EXISTS estimator TEXT,
ADD COLUMN IF NOT EXISTS sales_person TEXT,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS reported_by TEXT,
ADD COLUMN IF NOT EXISTS division TEXT;

-- Add score columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS cos_score NUMERIC(3,1) CHECK (cos_score >= 0 AND cos_score <= 10),
ADD COLUMN IF NOT EXISTS nps_score NUMERIC(3,1) CHECK (nps_score >= 0 AND nps_score <= 10);

-- Add estimate value column
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS estimate_value NUMERIC(12,2);

-- Add job name column (for referral/large loss jobs)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS job_name TEXT;

-- Add insurance company columns (for referral/large loss jobs)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_adjuster_name TEXT,
ADD COLUMN IF NOT EXISTS insurance_adjuster_phone TEXT,
ADD COLUMN IF NOT EXISTS insurance_adjuster_email TEXT;

-- Add restoration company columns (for referral jobs)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS restoration_company TEXT,
ADD COLUMN IF NOT EXISTS restoration_contact TEXT,
ADD COLUMN IF NOT EXISTS restoration_phone TEXT,
ADD COLUMN IF NOT EXISTS restoration_email TEXT;

-- Add comments to document date columns
COMMENT ON COLUMN jobs.date_received IS 'Date the job was received';
COMMENT ON COLUMN jobs.date_started IS 'Date work started on the job';
COMMENT ON COLUMN jobs.date_inspected IS 'Date the job was inspected';
COMMENT ON COLUMN jobs.estimate_sent_date IS 'Date the estimate was sent to customer';
COMMENT ON COLUMN jobs.date_majority_completion IS 'Date majority of work was completed';
COMMENT ON COLUMN jobs.date_invoiced IS 'Date the invoice was sent';
COMMENT ON COLUMN jobs.date_paid IS 'Date payment was received';
COMMENT ON COLUMN jobs.date_closed IS 'Date the job was closed';

-- Add comments to document team member columns
COMMENT ON COLUMN jobs.pm IS 'Project Manager assigned to the job';
COMMENT ON COLUMN jobs.jfc IS 'Job File Coordinator assigned to the job';
COMMENT ON COLUMN jobs.estimator IS 'Estimator assigned to the job';
COMMENT ON COLUMN jobs.sales_person IS 'Sales Person assigned to the job';
COMMENT ON COLUMN jobs.referred_by IS 'Person or company who referred the job';
COMMENT ON COLUMN jobs.reported_by IS 'Person who reported the job';
COMMENT ON COLUMN jobs.division IS 'Division (MIT, RECON, LARGE LOSS, REFERRAL)';

-- Add comments to document score columns
COMMENT ON COLUMN jobs.cos_score IS 'Customer Satisfaction Score (0-10)';
COMMENT ON COLUMN jobs.nps_score IS 'Net Promoter Score (0-10)';

-- Add comments to document estimate value column
COMMENT ON COLUMN jobs.estimate_value IS 'Estimated value/cost of the job in dollars';

-- Add comments to document referral/large loss columns
COMMENT ON COLUMN jobs.job_name IS 'Job name (primarily for referral/large loss jobs)';
COMMENT ON COLUMN jobs.insurance_company IS 'Insurance company name';
COMMENT ON COLUMN jobs.insurance_policy_number IS 'Insurance policy number';
COMMENT ON COLUMN jobs.insurance_adjuster_name IS 'Insurance adjuster name';
COMMENT ON COLUMN jobs.insurance_adjuster_phone IS 'Insurance adjuster phone number';
COMMENT ON COLUMN jobs.insurance_adjuster_email IS 'Insurance adjuster email address';
COMMENT ON COLUMN jobs.restoration_company IS 'Restoration company executing referral';
COMMENT ON COLUMN jobs.restoration_contact IS 'Restoration company contact person';
COMMENT ON COLUMN jobs.restoration_phone IS 'Restoration company phone number';
COMMENT ON COLUMN jobs.restoration_email IS 'Restoration company email address';
