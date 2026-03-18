-- Drop the old table
DROP TABLE IF EXISTS master_table;

-- Recreate with columns in exact Dash report order
CREATE TABLE master_table (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_number TEXT,
  job_status TEXT,
  customer TEXT,
  job_name TEXT,
  division TEXT,
  reason_for_closing TEXT,
  loss_category TEXT,
  insurance_carrier TEXT,
  claim_number TEXT,
  supervisor TEXT,
  foreperson TEXT,
  coordinator TEXT,
  estimator TEXT,
  marketing_person TEXT,
  estimate_owner TEXT,
  dispatcher TEXT,
  date_received TIMESTAMPTZ,
  date_started DATE,
  date_inspected DATE,
  date_inventoried DATE,
  estimate_sent_date DATE,
  date_of_majority_completion DATE,
  job_completion_percentage NUMERIC,
  target_start_date TIMESTAMPTZ,
  target_completion_date DATE,
  insured_contacted TIMESTAMPTZ,
  date_invoiced DATE,
  date_paid DATE,
  date_closed DATE,
  total_estimates NUMERIC,
  total_invoiced NUMERIC,
  total_collected NUMERIC,
  total_job_cost NUMERIC,
  estimated_gp_pct NUMERIC,
  working_gross_profit_pct NUMERIC,
  actual_gross_profit_pct NUMERIC,
  referred_by TEXT,
  referral_type TEXT,
  reported_by TEXT,
  survey_score TEXT,
  external_file_number TEXT,
  date_of_cos DATE,
  last_journal_note_datetime TIMESTAMPTZ,
  last_journal_note_entered TEXT,
  company_contact_name TEXT,
  customer_primary_contact_number TEXT,
  state TEXT,
  city TEXT,
  address TEXT,
  zip TEXT,
  tags TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-enable RLS
ALTER TABLE master_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON master_table FOR ALL TO authenticated USING (true) WITH CHECK (true);
;
