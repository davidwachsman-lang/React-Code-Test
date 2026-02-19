-- Add external_job_number column to jobs table
-- Stores job IDs/numbers from external systems (e.g., imported via Excel)
-- Keeps internal job_number (YY-DIV-####) separate from external references

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS external_job_number TEXT;

-- Index for lookups by external job number
CREATE INDEX IF NOT EXISTS idx_jobs_external_job_number
ON public.jobs (external_job_number)
WHERE external_job_number IS NOT NULL;

-- Add a source_system column to track where the job originated
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'internal';

COMMENT ON COLUMN public.jobs.external_job_number IS 'Job ID/number from an external system (e.g., imported data). Internal jobs use job_number instead.';
COMMENT ON COLUMN public.jobs.source_system IS 'Origin of the job record: internal (intake form), or name of external system';
