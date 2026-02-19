-- =============================================================================
-- Migration: job_file_system_sync.sql
-- Purpose:   Align Supabase schema with updated job file system codebase
-- Date:      2026-02-17
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CUSTOMERS TABLE
--    jobService.js joins: customers!inner(name, phone, email)
--    Jobs reference customer_id → customers.id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  company     TEXT,
  crm_id      UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was pre-existing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company    TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS crm_id     UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_customers_crm_id ON customers(crm_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow anon select on customers'
  ) THEN
    CREATE POLICY "Allow anon select on customers"   ON customers FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow anon insert on customers'
  ) THEN
    CREATE POLICY "Allow anon insert on customers"   ON customers FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow anon update on customers'
  ) THEN
    CREATE POLICY "Allow anon update on customers"   ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow anon delete on customers'
  ) THEN
    CREATE POLICY "Allow anon delete on customers"   ON customers FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow authenticated select on customers'
  ) THEN
    CREATE POLICY "Allow authenticated select on customers" ON customers FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow authenticated insert on customers'
  ) THEN
    CREATE POLICY "Allow authenticated insert on customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow authenticated update on customers'
  ) THEN
    CREATE POLICY "Allow authenticated update on customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow authenticated delete on customers'
  ) THEN
    CREATE POLICY "Allow authenticated delete on customers" ON customers FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROPERTIES TABLE — add missing columns
--    jobService.js reads: address1, address2, city, state, postal_code,
--                         latitude, longitude
--    Properties table exists but may be missing these columns.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address1    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address2    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city        TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state       TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude    DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude   DOUBLE PRECISION;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. JOBS TABLE — add missing columns
--    These columns are written/read by the job detail tabs and jobService.js
-- ─────────────────────────────────────────────────────────────────────────────

-- Foreign keys to customers and properties
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- FNOL / Intake fields (supabaseField mappings from FNOLTab)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS loss_type      TEXT;   -- Water, Fire, Mold, Bio, etc.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS loss_cause     TEXT;   -- Source of loss description
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS date_of_loss   TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS property_type  TEXT;   -- Residential, Commercial

-- Internal notes (CommunicationsTab writes timestamped entries)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Closure fields (OverviewTab reads these when status=closed)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_by      TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closure_notes  TEXT;

-- Scope summary (used in search and display)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scope_summary  TEXT;

-- Indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_property_id ON jobs(property_id);

-- Index for loss_type filtering
CREATE INDEX IF NOT EXISTS idx_jobs_loss_type ON jobs(loss_type);

-- Index for property_type filtering
CREATE INDEX IF NOT EXISTS idx_jobs_property_type ON jobs(property_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. JOB CLOSE REASON TABLES
--    jobCloseReasonsService.js queries these tables for macro/sub reasons
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_close_macro_reason (
  id          SERIAL PRIMARY KEY,
  label       TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_close_sub_reason (
  id              SERIAL PRIMARY KEY,
  macro_reason_id INTEGER NOT NULL REFERENCES job_close_macro_reason(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_close_sub_reason_macro ON job_close_sub_reason(macro_reason_id);

-- RLS for close reason tables
ALTER TABLE job_close_macro_reason ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_close_sub_reason   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_close_macro_reason' AND policyname = 'Allow anon select on job_close_macro_reason'
  ) THEN
    CREATE POLICY "Allow anon select on job_close_macro_reason" ON job_close_macro_reason FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_close_macro_reason' AND policyname = 'Allow authenticated select on job_close_macro_reason'
  ) THEN
    CREATE POLICY "Allow authenticated select on job_close_macro_reason" ON job_close_macro_reason FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_close_sub_reason' AND policyname = 'Allow anon select on job_close_sub_reason'
  ) THEN
    CREATE POLICY "Allow anon select on job_close_sub_reason" ON job_close_sub_reason FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_close_sub_reason' AND policyname = 'Allow authenticated select on job_close_sub_reason'
  ) THEN
    CREATE POLICY "Allow authenticated select on job_close_sub_reason" ON job_close_sub_reason FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed default close reasons
INSERT INTO job_close_macro_reason (id, code, label, sort_order) VALUES
  (1, 'completed',    'Job Completed',       1),
  (2, 'cancelled',    'Customer Cancelled',  2),
  (3, 'lost',         'Lost to Competitor',  3),
  (4, 'denied',       'Insurance Denied',    4),
  (5, 'duplicate',    'Duplicate / Error',   5),
  (6, 'other',        'Other',               6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_close_sub_reason (id, macro_reason_id, code, label, sort_order) VALUES
  -- Job Completed
  (1,  1, 'finished_invoiced',     'All work finished and invoiced',          1),
  (2,  1, 'partial_satisfied',     'Partial completion — customer satisfied', 2),
  -- Customer Cancelled
  (3,  2, 'chose_not_proceed',     'Customer chose not to proceed',           1),
  (4,  2, 'hired_another',         'Customer hired another contractor',       2),
  (5,  2, 'doing_themselves',      'Customer doing work themselves',          3),
  -- Lost to Competitor
  (6,  3, 'price',                 'Price',                                   1),
  (7,  3, 'availability',          'Availability / timing',                   2),
  (8,  3, 'preferred_vendor',      'Preferred vendor program',                3),
  -- Insurance Denied
  (9,  4, 'claim_denied',          'Claim denied by carrier',                 1),
  (10, 4, 'coverage_lapsed',       'Coverage lapsed',                         2),
  (11, 4, 'pre_existing',          'Pre-existing condition',                  3),
  -- Duplicate / Error
  (12, 5, 'duplicate_entry',       'Duplicate job entry',                     1),
  (13, 5, 'test_training',         'Test / training record',                  2),
  -- Other
  (14, 6, 'referred_out',          'Referred out',                            1),
  (15, 6, 'property_sold',         'Property sold',                           2),
  (16, 6, 'other_see_notes',       'Other — see notes',                       3)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. UPDATE VIEWS THAT REFERENCE JOBS
--    crm_with_customer_metrics view joins jobs on crm_id — no changes needed.
--    crm_roi_data view joins jobs on crm_id — no changes needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add a convenience view for job list with customer/property flattened
CREATE OR REPLACE VIEW jobs_with_details AS
SELECT
  j.*,
  c.name   AS customer_name,
  c.phone  AS customer_phone,
  c.email  AS customer_email,
  p.address1 AS property_address1,
  p.address2 AS property_address2,
  p.city     AS property_city,
  p.state    AS property_state,
  p.postal_code AS property_postal_code,
  p.latitude AS property_latitude,
  p.longitude AS property_longitude
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN properties p ON p.id = j.property_id;

GRANT SELECT ON jobs_with_details TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ENSURE JOBS RLS POLICIES COVER NEW OPERATIONS
--    (The jobs table should already have RLS; add policies if missing)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow anon select on jobs'
  ) THEN
    CREATE POLICY "Allow anon select on jobs"  ON jobs FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow anon insert on jobs'
  ) THEN
    CREATE POLICY "Allow anon insert on jobs"  ON jobs FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow anon update on jobs'
  ) THEN
    CREATE POLICY "Allow anon update on jobs"  ON jobs FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow anon delete on jobs'
  ) THEN
    CREATE POLICY "Allow anon delete on jobs"  ON jobs FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated select on jobs'
  ) THEN
    CREATE POLICY "Allow authenticated select on jobs" ON jobs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated insert on jobs'
  ) THEN
    CREATE POLICY "Allow authenticated insert on jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated update on jobs'
  ) THEN
    CREATE POLICY "Allow authenticated update on jobs" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated delete on jobs'
  ) THEN
    CREATE POLICY "Allow authenticated delete on jobs" ON jobs FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PROPERTIES RLS (ensure join from jobs works)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow anon select on properties'
  ) THEN
    CREATE POLICY "Allow anon select on properties"  ON properties FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow anon insert on properties'
  ) THEN
    CREATE POLICY "Allow anon insert on properties"  ON properties FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow anon update on properties'
  ) THEN
    CREATE POLICY "Allow anon update on properties"  ON properties FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow anon delete on properties'
  ) THEN
    CREATE POLICY "Allow anon delete on properties"  ON properties FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow authenticated select on properties'
  ) THEN
    CREATE POLICY "Allow authenticated select on properties" ON properties FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow authenticated insert on properties'
  ) THEN
    CREATE POLICY "Allow authenticated insert on properties" ON properties FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow authenticated update on properties'
  ) THEN
    CREATE POLICY "Allow authenticated update on properties" ON properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Allow authenticated delete on properties'
  ) THEN
    CREATE POLICY "Allow authenticated delete on properties" ON properties FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
