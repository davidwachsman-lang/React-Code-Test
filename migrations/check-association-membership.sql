-- Check if association_membership column exists in crm_records table
-- Run this in your Supabase SQL Editor

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'crm_records'
  AND column_name = 'association_membership';

-- If the above query returns no rows, the column doesn't exist
-- Run the following to add it:

-- ALTER TABLE crm_records
-- ADD COLUMN IF NOT EXISTS association_membership TEXT;

