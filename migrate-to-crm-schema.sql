-- ============================================
-- CRM Schema Migration
-- Run this in your Supabase SQL Editor
-- Migrates prospects → crm_records with relationship_stage
-- ============================================

-- ============================================
-- 1. RENAME TABLES AND UPDATE COLUMNS
-- ============================================

-- Rename prospects table to crm_records (only if it exists and crm_records doesn't)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_records') THEN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospects') THEN
      ALTER TABLE prospects RENAME TO crm_records;
    END IF;
  END IF;
END $$;

-- Add relationship_stage column (will map from status)
ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS relationship_stage TEXT CHECK (relationship_stage IN ('prospect', 'active_customer', 'inactive', 'lost'));

-- Ensure association_membership column exists (for commercial prospects)
ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS association_membership TEXT;

-- Map existing status values to relationship_stage (only if status column exists and relationship_stage is null)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'crm_records' AND column_name = 'status') THEN
    UPDATE crm_records
    SET relationship_stage = CASE
      WHEN status = 'lead' THEN 'prospect'
      WHEN status = 'active' THEN 'prospect'
      WHEN status = 'won' THEN 'active_customer'
      WHEN status = 'lost' THEN 'lost'
      ELSE 'prospect'
    END
    WHERE relationship_stage IS NULL;
  END IF;
END $$;

-- Set NOT NULL constraint after data migration (only if column exists and is nullable)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'crm_records' 
             AND column_name = 'relationship_stage' 
             AND is_nullable = 'YES') THEN
    ALTER TABLE crm_records ALTER COLUMN relationship_stage SET NOT NULL;
  END IF;
END $$;

-- Set default for relationship_stage (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'crm_records' AND column_name = 'relationship_stage') THEN
    ALTER TABLE crm_records ALTER COLUMN relationship_stage SET DEFAULT 'prospect';
  END IF;
END $$;

-- Rename is_top_10_target to is_top_target (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'crm_records' AND column_name = 'is_top_10_target') THEN
    ALTER TABLE crm_records RENAME COLUMN is_top_10_target TO is_top_target;
  END IF;
END $$;

-- Rename parent_prospect_id to parent_id (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'crm_records' AND column_name = 'parent_prospect_id') THEN
    ALTER TABLE crm_records RENAME COLUMN parent_prospect_id TO parent_id;
  END IF;
END $$;

-- Update self-reference foreign key
ALTER TABLE crm_records
DROP CONSTRAINT IF EXISTS prospects_parent_prospect_id_fkey;

ALTER TABLE crm_records
ADD CONSTRAINT crm_records_parent_id_fkey
FOREIGN KEY (parent_id) REFERENCES crm_records(id) ON DELETE SET NULL;

-- ============================================
-- 2. RENAME ACTIVITIES TABLE
-- ============================================

-- Check if crm_activities already exists, if not rename prospect_activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_activities') THEN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_activities') THEN
      ALTER TABLE prospect_activities RENAME TO crm_activities;
    END IF;
  END IF;
END $$;

-- Rename prospect_id to crm_id in crm_activities, or add crm_id if neither exists
DO $$
BEGIN
  -- Only proceed if crm_activities table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_activities') THEN
    -- Check if crm_id already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'crm_activities' AND column_name = 'crm_id') THEN
      -- If prospect_id exists, rename it to crm_id
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'crm_activities' AND column_name = 'prospect_id') THEN
        ALTER TABLE crm_activities RENAME COLUMN prospect_id TO crm_id;
      ELSE
        -- If neither exists, add crm_id column (assuming it should reference crm_records)
        -- But first check if crm_records exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_records') THEN
          ALTER TABLE crm_activities ADD COLUMN crm_id UUID;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Update foreign key constraint (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_activities') THEN
    -- Drop old constraint if it exists
    ALTER TABLE crm_activities
    DROP CONSTRAINT IF EXISTS prospect_activities_prospect_id_fkey;
    
    -- Only add new constraint if crm_id column exists and constraint doesn't exist
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'crm_activities' AND column_name = 'crm_id') THEN
      IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'crm_activities_crm_id_fkey') THEN
        -- Make sure crm_records table exists before adding foreign key
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_records') THEN
          ALTER TABLE crm_activities
          ADD CONSTRAINT crm_activities_crm_id_fkey
          FOREIGN KEY (crm_id) REFERENCES crm_records(id) ON DELETE CASCADE;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. UPDATE PROPERTIES TABLE
-- ============================================

-- Rename prospect_id to crm_id in properties, or add crm_id if neither exists
DO $$
BEGIN
  -- Only proceed if properties table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    -- Check if crm_id already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'properties' AND column_name = 'crm_id') THEN
      -- If prospect_id exists, rename it to crm_id
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'prospect_id') THEN
        ALTER TABLE properties RENAME COLUMN prospect_id TO crm_id;
      -- Note: We don't auto-add crm_id to properties if it doesn't exist
      -- as properties might have a different structure (customer_id, etc.)
      END IF;
    END IF;
  END IF;
END $$;

-- Update foreign key constraint (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    -- Drop old constraint if it exists
    ALTER TABLE properties
    DROP CONSTRAINT IF EXISTS properties_prospect_id_fkey;
    
    -- Only add new constraint if crm_id column exists and constraint doesn't exist
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'properties' AND column_name = 'crm_id') THEN
      IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'properties_crm_id_fkey') THEN
        -- Make sure crm_records table exists before adding foreign key
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_records') THEN
          ALTER TABLE properties
          ADD CONSTRAINT properties_crm_id_fkey
          FOREIGN KEY (crm_id) REFERENCES crm_records(id) ON DELETE CASCADE;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. UPDATE JOBS TABLE (for customer metrics)
-- ============================================

-- Add crm_id column to jobs table if it doesn't exist
-- This links jobs to CRM records for calculating customer metrics
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS crm_id UUID REFERENCES crm_records(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_crm_id ON jobs(crm_id);

-- ============================================
-- 5. UPDATE INDEXES
-- ============================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_prospects_status;
DROP INDEX IF EXISTS idx_prospects_is_top_10;
DROP INDEX IF EXISTS idx_prospects_parent;
DROP INDEX IF EXISTS idx_activities_prospect;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_crm_records_relationship_stage ON crm_records(relationship_stage);
CREATE INDEX IF NOT EXISTS idx_crm_records_is_top_target ON crm_records(is_top_target) WHERE is_top_target = true;
CREATE INDEX IF NOT EXISTS idx_crm_records_parent_id ON crm_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_crm_records_next_followup ON crm_records(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_crm_activities_crm_id ON crm_activities(crm_id);
CREATE INDEX IF NOT EXISTS idx_properties_crm_id ON properties(crm_id);

-- ============================================
-- 6. UPDATE TRIGGERS
-- ============================================

-- Update trigger name for crm_records
DROP TRIGGER IF EXISTS prospects_updated_at ON crm_records;
CREATE TRIGGER crm_records_updated_at
BEFORE UPDATE ON crm_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. CREATE VIEWS FOR CUSTOMER METRICS
-- ============================================

-- View: crm_with_customer_metrics
-- Calculates lifetime_revenue, total_jobs, first_job_date, last_job_date from jobs table
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
-- Top targets OR prospects with followup date within 7 days
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
-- Active customers with no jobs in 60+ days
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

-- ============================================
-- 8. UPDATE ROW LEVEL SECURITY POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow anon CRUD on prospects" ON crm_records;
DROP POLICY IF EXISTS "Allow anon CRUD on prospect_activities" ON crm_activities;

-- Create new policies
CREATE POLICY "Allow anon CRUD on crm_records" ON crm_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon CRUD on crm_activities" ON crm_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 9. UPDATE COMMENTS
-- ============================================

COMMENT ON TABLE crm_records IS 'Unified CRM records table - tracks prospects and customers';
COMMENT ON TABLE crm_activities IS 'Activity log for CRM record interactions';
COMMENT ON COLUMN crm_records.parent_id IS 'Reference to parent CRM record for child locations';
COMMENT ON COLUMN crm_records.prospect_type IS 'Type of record: commercial, agent, or adjuster';
COMMENT ON COLUMN crm_records.is_top_target IS 'Flag for top priority targets';
COMMENT ON COLUMN crm_records.relationship_stage IS 'Current relationship stage: prospect, active_customer, inactive, or lost';
COMMENT ON COLUMN crm_records.converted_to_customer_id IS 'Reference to customers table when record converts (legacy)';
COMMENT ON COLUMN jobs.crm_id IS 'Reference to CRM record for calculating customer metrics';

-- ============================================
-- 10. DATA CLEANUP (Optional)
-- ============================================

-- Note: The old 'status' column is kept for backward compatibility
-- You can drop it later after verifying everything works:
-- ALTER TABLE crm_records DROP COLUMN IF EXISTS status;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Verify all data migrated correctly
-- 2. Test views and queries
-- 3. Update application code to use new table/column names
-- 4. After verification, optionally drop old 'status' column

