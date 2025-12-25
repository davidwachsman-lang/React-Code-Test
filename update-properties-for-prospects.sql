-- ============================================
-- Update Properties Table for Prospects
-- Run this AFTER migrate-to-prospects-schema.sql
-- ============================================

-- ============================================
-- 1. MIGRATE customer_id → prospect_id
-- ============================================
-- This assumes you've already run the customer → prospect migration
-- and have a way to map customer_id to prospect_id

-- Option A: If you have a mapping table or can join on email/name
-- Update properties to link to prospects based on matching criteria
UPDATE properties p
SET prospect_id = pr.id
FROM prospects pr
WHERE p.customer_id IS NOT NULL
  AND (
    -- Match by email if available
    (p.customer_id IN (SELECT id FROM customers WHERE email = pr.email AND email IS NOT NULL AND email != ''))
    OR
    -- Match by company name
    (p.customer_id IN (SELECT id FROM customers WHERE company_name = pr.company_name AND company_name IS NOT NULL AND company_name != ''))
    OR
    -- Match by contact name
    (p.customer_id IN (SELECT id FROM customers WHERE contact_name = CONCAT(pr.first_name, ' ', pr.last_name) AND contact_name IS NOT NULL))
  )
  AND p.prospect_id IS NULL;

-- Option B: Manual mapping (if you need to review each one)
-- Uncomment and adjust as needed:
-- UPDATE properties SET prospect_id = 'prospect-uuid-here' WHERE customer_id = 'customer-id-here';

-- ============================================
-- 2. VERIFY MIGRATION
-- ============================================
-- Check how many properties were migrated
SELECT 
  COUNT(*) as total_properties,
  COUNT(prospect_id) as properties_with_prospect,
  COUNT(customer_id) as properties_with_customer,
  COUNT(*) - COUNT(prospect_id) as unmigrated_properties
FROM properties;

-- ============================================
-- 3. DROP customer_id COLUMN (OPTIONAL - DO THIS AFTER VERIFICATION)
-- ============================================
-- Only uncomment and run this after you've verified all properties are migrated
-- and you no longer need the customer_id reference

-- ALTER TABLE properties DROP COLUMN IF EXISTS customer_id;

-- ============================================
-- 4. UPDATE FOREIGN KEY CONSTRAINTS (if needed)
-- ============================================
-- If you need to ensure prospect_id is required going forward:
-- ALTER TABLE properties ALTER COLUMN prospect_id SET NOT NULL;

