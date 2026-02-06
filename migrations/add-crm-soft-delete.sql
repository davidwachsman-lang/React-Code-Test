-- Add soft delete columns to crm_records table
-- Run this in your Supabase SQL Editor

-- Add is_deleted column (boolean flag to mark records as deleted/hidden)
ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Set existing records to FALSE (in case they were NULL)
UPDATE crm_records
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

-- Add deleted_at column (timestamp when record was deleted/hidden)
ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_crm_records_is_deleted ON crm_records(is_deleted) WHERE is_deleted IS NULL OR is_deleted = FALSE;

-- Add comments
COMMENT ON COLUMN crm_records.is_deleted IS 'Flag to mark CRM records as deleted/hidden. Records with is_deleted=true are hidden from all CRM views.';
COMMENT ON COLUMN crm_records.deleted_at IS 'Timestamp when the CRM record was marked as deleted/hidden.';

