-- Add courting_cost column to crm_records table
-- This tracks expenses spent while courting/acquiring the customer
-- Run this in your Supabase SQL Editor

ALTER TABLE crm_records
ADD COLUMN IF NOT EXISTS courting_cost NUMERIC(12,2) DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN crm_records.courting_cost IS 'Total expenses spent while courting/acquiring this customer (meals, travel, gifts, etc.)';

