-- Change sales rep columns from UUID to TEXT in crm_records table
-- Run this in your Supabase SQL Editor

-- Step 1: Drop dependent views first
DROP VIEW IF EXISTS prospects_with_property_count CASCADE;
DROP VIEW IF EXISTS crm_with_property_count CASCADE;
DROP VIEW IF EXISTS crm_with_customer_metrics CASCADE;
DROP VIEW IF EXISTS crm_top_targets CASCADE;
DROP VIEW IF EXISTS crm_active_prospects CASCADE;
DROP VIEW IF EXISTS crm_hot_prospects CASCADE;
DROP VIEW IF EXISTS crm_at_risk_customers CASCADE;

-- Step 2: Drop any foreign key constraints if they exist
-- IMPORTANT: Drop constraints BEFORE changing column types

-- Find and drop ALL constraints that reference primary_sales_rep, secondary_sales_rep, or account_manager
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Loop through all foreign key constraints that reference these columns
  FOR r IN 
    SELECT 
      tc.table_name, 
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name IN ('primary_sales_rep', 'secondary_sales_rep', 'account_manager')
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- Also explicitly drop known constraint names (in case the above doesn't catch them)
DO $$
BEGIN
  -- Try to drop on prospects table
  BEGIN
    ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_primary_sales_rep_fkey;
    ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_secondary_sales_rep_fkey;
    ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_account_manager_fkey;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;
  
  -- Try to drop on crm_records table
  BEGIN
    ALTER TABLE crm_records DROP CONSTRAINT IF EXISTS crm_records_primary_sales_rep_fkey;
    ALTER TABLE crm_records DROP CONSTRAINT IF EXISTS crm_records_secondary_sales_rep_fkey;
    ALTER TABLE crm_records DROP CONSTRAINT IF EXISTS crm_records_account_manager_fkey;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;
END $$;

-- Step 3: Change column types from UUID to TEXT
-- Note: If you get an error about prospects_primary_sales_rep_fkey, 
-- run this first: ALTER TABLE prospects DROP CONSTRAINT prospects_primary_sales_rep_fkey;

-- Change crm_records columns
ALTER TABLE crm_records
ALTER COLUMN primary_sales_rep TYPE TEXT USING 
  CASE 
    WHEN primary_sales_rep IS NULL THEN NULL
    ELSE primary_sales_rep::TEXT
  END;

ALTER TABLE crm_records
ALTER COLUMN secondary_sales_rep TYPE TEXT USING 
  CASE 
    WHEN secondary_sales_rep IS NULL THEN NULL
    ELSE secondary_sales_rep::TEXT
  END;

ALTER TABLE crm_records
ALTER COLUMN account_manager TYPE TEXT USING 
  CASE 
    WHEN account_manager IS NULL THEN NULL
    ELSE account_manager::TEXT
  END;

-- Also change prospects table columns if it exists separately
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospects') THEN
    ALTER TABLE prospects
    ALTER COLUMN primary_sales_rep TYPE TEXT USING 
      CASE 
        WHEN primary_sales_rep IS NULL THEN NULL
        ELSE primary_sales_rep::TEXT
      END;

    ALTER TABLE prospects
    ALTER COLUMN secondary_sales_rep TYPE TEXT USING 
      CASE 
        WHEN secondary_sales_rep IS NULL THEN NULL
        ELSE secondary_sales_rep::TEXT
      END;

    ALTER TABLE prospects
    ALTER COLUMN account_manager TYPE TEXT USING 
      CASE 
        WHEN account_manager IS NULL THEN NULL
        ELSE account_manager::TEXT
      END;
  END IF;
END $$;

-- Step 4: Recreate views
-- View: crm_with_customer_metrics
CREATE OR REPLACE VIEW crm_with_customer_metrics AS
SELECT 
  c.*,
  COALESCE(SUM(j.estimate_value), 0) as lifetime_revenue,
  COUNT(j.id) as total_jobs,
  MIN(j.date_received) as first_job_date,
  MAX(j.date_received) as last_job_date
FROM crm_records c
LEFT JOIN jobs j ON j.crm_id = c.id
GROUP BY c.id;

-- View: crm_top_targets
CREATE OR REPLACE VIEW crm_top_targets AS
SELECT * FROM crm_records
WHERE is_top_target = true
ORDER BY created_at DESC;

-- View: crm_active_prospects
CREATE OR REPLACE VIEW crm_active_prospects AS
SELECT * FROM crm_records
WHERE relationship_stage = 'prospect'
ORDER BY created_at DESC;

-- View: crm_hot_prospects
CREATE OR REPLACE VIEW crm_hot_prospects AS
SELECT * FROM crm_records
WHERE relationship_stage = 'prospect'
  AND (
    is_top_target = true
    OR (next_followup_date IS NOT NULL AND next_followup_date <= CURRENT_DATE + INTERVAL '7 days')
  )
ORDER BY 
  is_top_target DESC,
  next_followup_date ASC NULLS LAST;

-- View: crm_at_risk_customers
CREATE OR REPLACE VIEW crm_at_risk_customers AS
SELECT 
  c.*,
  MAX(j.date_received) as last_job_date_calculated
FROM crm_records c
LEFT JOIN jobs j ON j.crm_id = c.id
WHERE c.relationship_stage = 'active_customer'
GROUP BY c.id
HAVING MAX(j.date_received) < CURRENT_DATE - INTERVAL '60 days'
   OR MAX(j.date_received) IS NULL
ORDER BY last_job_date_calculated ASC NULLS LAST;

-- View: crm_with_property_count
CREATE OR REPLACE VIEW crm_with_property_count AS
SELECT 
  c.*,
  COUNT(p.id) as properties_count
FROM crm_records c
LEFT JOIN properties p ON p.crm_id = c.id
GROUP BY c.id;

-- Step 5: Add comments
COMMENT ON COLUMN crm_records.primary_sales_rep IS 'Primary sales rep assigned to this CRM record (text name)';
COMMENT ON COLUMN crm_records.secondary_sales_rep IS 'Secondary sales rep assigned to this CRM record (text name)';
COMMENT ON COLUMN crm_records.account_manager IS 'Account manager assigned to this CRM record (text name)';

