-- Add 16 job file check boolean columns + info columns to jobs table
-- These track compliance checks from the Job File Checks module

-- Setup checks
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_job_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_dbmx_file_created BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_start_date_entered BOOLEAN DEFAULT FALSE;

-- Agreement checks
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_atp_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_customer_info_form_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_equipment_resp_form_signed BOOLEAN DEFAULT FALSE;

-- Photo checks
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_cause_of_loss_photo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_front_of_structure_photo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_pre_mitigation_photos BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_daily_departure_photos BOOLEAN DEFAULT FALSE;

-- Field work checks
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_docusketch_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_initial_scope_sheet_entered BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_equipment_placed_and_logged BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_initial_atmospheric_readings BOOLEAN DEFAULT FALSE;

-- Notes checks
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_day_1_note_entered BOOLEAN DEFAULT FALSE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chk_initial_inspection_questions BOOLEAN DEFAULT FALSE;

-- Info columns from Job File Checks Excel (days active tracked here)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS days_active INTEGER;

COMMENT ON COLUMN public.jobs.chk_job_locked IS 'Job File Check: Job Locked';
COMMENT ON COLUMN public.jobs.chk_atp_signed IS 'Job File Check: ATP Signed';
COMMENT ON COLUMN public.jobs.days_active IS 'Number of days the job has been active';
