-- Add job closure tracking columns
-- Run this in your Supabase SQL Editor

-- Add closure reason and closed by columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS closure_macro_reason_id INTEGER,
ADD COLUMN IF NOT EXISTS closure_sub_reason_id INTEGER,
ADD COLUMN IF NOT EXISTS closed_by TEXT,
ADD COLUMN IF NOT EXISTS closure_notes TEXT;

-- Add foreign key constraints (assuming lookup tables exist)
ALTER TABLE jobs
ADD CONSTRAINT fk_closure_macro_reason
  FOREIGN KEY (closure_macro_reason_id)
  REFERENCES job_close_macro_reason(id)
  ON DELETE SET NULL;

ALTER TABLE jobs
ADD CONSTRAINT fk_closure_sub_reason
  FOREIGN KEY (closure_sub_reason_id)
  REFERENCES job_close_sub_reason(id)
  ON DELETE SET NULL;

-- Update the status check constraint to include 'closed'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'wip', 'ready_to_bill', 'ar', 'complete', 'closed'));

-- Add comments
COMMENT ON COLUMN jobs.closure_macro_reason_id IS 'Foreign key to job_close_macro_reason table';
COMMENT ON COLUMN jobs.closure_sub_reason_id IS 'Foreign key to job_close_sub_reason table';
COMMENT ON COLUMN jobs.closed_by IS 'Name of person who closed the job';
COMMENT ON COLUMN jobs.closure_notes IS 'Additional notes about why the job was closed';
