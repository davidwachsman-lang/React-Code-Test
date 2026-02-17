-- Add missing job file fields to the jobs table
-- These were previously stored in browser localStorage ("Preview" fields)

-- Overview fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS job_group TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS department TEXT;

-- Personnel fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS crew_chief TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS estimate_owner TEXT;
-- Note: business_dev_rep maps to existing sales_person column

-- Date fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS target_completion_date DATE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS date_of_cos DATE;
-- Note: date_of_loss already exists

-- Financial fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS invoiced_amount NUMERIC(12,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS subcontractor_cost NUMERIC(12,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(12,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ar_balance NUMERIC(12,2);

-- Comments
COMMENT ON COLUMN public.jobs.stage IS 'Job stage (e.g., Initial Response, Drying, Rebuild)';
COMMENT ON COLUMN public.jobs.job_group IS 'Job group classification';
COMMENT ON COLUMN public.jobs.department IS 'Department / Job type';
COMMENT ON COLUMN public.jobs.crew_chief IS 'Assigned crew chief name';
COMMENT ON COLUMN public.jobs.estimate_owner IS 'Person responsible for the estimate';
COMMENT ON COLUMN public.jobs.target_completion_date IS 'Target date for job completion';
COMMENT ON COLUMN public.jobs.date_of_cos IS 'Date of Certificate of Satisfaction';
COMMENT ON COLUMN public.jobs.invoiced_amount IS 'Total amount invoiced';
COMMENT ON COLUMN public.jobs.subcontractor_cost IS 'Total subcontractor costs';
COMMENT ON COLUMN public.jobs.labor_cost IS 'Total labor costs';
COMMENT ON COLUMN public.jobs.ar_balance IS 'Accounts receivable balance';
