-- Fix constraint names after table rename from prospects to crm_records
-- Run this in your Supabase SQL Editor

-- Rename damage_type constraint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_damage_type_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_damage_type_check TO crm_records_damage_type_check;
  END IF;
END $$;

-- Rename other potential constraints that might have old table name
DO $$
BEGIN
  -- Rename industry constraint
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_industry_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_industry_check TO crm_records_industry_check;
  END IF;
  
  -- Rename prospect_type constraint
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_prospect_type_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_prospect_type_check TO crm_records_prospect_type_check;
  END IF;
  
  -- Rename lead_source constraint
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_lead_source_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_lead_source_check TO crm_records_lead_source_check;
  END IF;
  
  -- Rename priority constraint
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_priority_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_priority_check TO crm_records_priority_check;
  END IF;
  
  -- Rename probability_to_close constraint
  IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'prospects_probability_to_close_check') THEN
    ALTER TABLE crm_records RENAME CONSTRAINT prospects_probability_to_close_check TO crm_records_probability_to_close_check;
  END IF;
END $$;

