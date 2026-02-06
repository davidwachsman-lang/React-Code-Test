-- Delete all CRM records except Target Corporation
-- Run this in your Supabase SQL Editor
-- WARNING: This will permanently delete data. Make sure you have a backup!

-- First, let's see what we're about to delete (for safety)
-- Uncomment the SELECT statement below to preview what will be deleted:

-- SELECT id, company_name, relationship_stage, created_at
-- FROM crm_records
-- WHERE LOWER(TRIM(company_name)) != LOWER(TRIM('Target Corporation'))
-- ORDER BY company_name;

-- Option 1: Delete all records except Target Corporation (case-insensitive)
-- This handles foreign key relationships by deleting in the correct order

-- Step 1: Get Target Corporation's ID
DO $$
DECLARE
  target_corp_id UUID;
BEGIN
  -- Find Target Corporation's ID
  SELECT id INTO target_corp_id
  FROM crm_records
  WHERE LOWER(TRIM(company_name)) = LOWER(TRIM('Target Corporation'))
  LIMIT 1;
  
  IF target_corp_id IS NULL THEN
    RAISE EXCEPTION 'Target Corporation not found in database';
  END IF;
  
  -- Step 2: Delete jobs that reference properties belonging to non-Target Corporation CRM records
  DELETE FROM jobs
  WHERE property_id IN (
    SELECT p.id
    FROM properties p
    JOIN crm_records c ON p.crm_id = c.id
    WHERE c.id != target_corp_id
  );
  
  -- Step 3: Delete properties belonging to non-Target Corporation CRM records
  DELETE FROM properties
  WHERE crm_id IN (
    SELECT id
    FROM crm_records
    WHERE id != target_corp_id
  );
  
  -- Step 4: Delete CRM activities belonging to non-Target Corporation CRM records
  DELETE FROM crm_activities
  WHERE crm_id IN (
    SELECT id
    FROM crm_records
    WHERE id != target_corp_id
  );
  
  -- Step 5: Update jobs that reference non-Target Corporation CRM records (set crm_id to NULL)
  UPDATE jobs
  SET crm_id = NULL
  WHERE crm_id IN (
    SELECT id
    FROM crm_records
    WHERE id != target_corp_id
  );
  
  -- Step 6: Finally, delete the CRM records (except Target Corporation and its children)
  DELETE FROM crm_records
  WHERE id != target_corp_id
  AND (parent_id IS NULL OR parent_id != target_corp_id);
  
  RAISE NOTICE 'Successfully deleted all CRM records except Target Corporation';
END $$;

-- Option 2: Safer version - Keep jobs but disconnect them from deleted CRM records
-- Use this if you want to preserve job history but just disconnect from deleted customers
-- Uncomment the code below:

-- DO $$
-- DECLARE
--   target_corp_id UUID;
-- BEGIN
--   -- Find Target Corporation's ID
--   SELECT id INTO target_corp_id
--   FROM crm_records
--   WHERE LOWER(TRIM(company_name)) = LOWER(TRIM('Target Corporation'))
--   LIMIT 1;
--   
--   IF target_corp_id IS NULL THEN
--     RAISE EXCEPTION 'Target Corporation not found in database';
--   END IF;
--   
--   -- Set foreign keys to NULL instead of deleting
--   UPDATE jobs SET property_id = NULL
--   WHERE property_id IN (
--     SELECT p.id FROM properties p
--     JOIN crm_records c ON p.crm_id = c.id
--     WHERE c.id != target_corp_id
--   );
--   
--   UPDATE jobs SET crm_id = NULL
--   WHERE crm_id IN (
--     SELECT id FROM crm_records WHERE id != target_corp_id
--   );
--   
--   -- Delete properties, activities, and CRM records
--   DELETE FROM properties WHERE crm_id != target_corp_id;
--   DELETE FROM crm_activities WHERE crm_id != target_corp_id;
--   DELETE FROM crm_records WHERE id != target_corp_id;
--   
--   RAISE NOTICE 'Successfully cleaned CRM records (jobs preserved but disconnected)';
-- END $$;

-- Option 3: If you want to keep child records of Target Corporation too
-- First, find the Target Corporation record ID
-- Then keep it and all its children, delete everything else
-- Uncomment the code below if you want this behavior:

-- DO $$
-- DECLARE
--   target_corp_id UUID;
-- BEGIN
--   -- Find Target Corporation's ID
--   SELECT id INTO target_corp_id
--   FROM crm_records
--   WHERE LOWER(TRIM(company_name)) = LOWER(TRIM('Target Corporation'))
--   LIMIT 1;
--   
--   -- Delete all records except Target Corporation and its children
--   IF target_corp_id IS NOT NULL THEN
--     DELETE FROM crm_records
--     WHERE id != target_corp_id
--     AND (parent_id IS NULL OR parent_id != target_corp_id);
--   ELSE
--     -- If Target Corporation doesn't exist, delete everything
--     DELETE FROM crm_records;
--   END IF;
-- END $$;

-- Note: This will also delete related records in other tables if you have CASCADE deletes set up
-- Check your foreign key constraints to see what else might be deleted:
-- SELECT 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'crm_records';

