-- ============================================
-- CRM Prospects Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE PROSPECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS prospects (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_type TEXT NOT NULL CHECK (prospect_type IN ('commercial', 'agent', 'adjuster')),
  parent_prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  
  -- Basic Info
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Commercial Specific
  industry TEXT CHECK (industry IN ('multi_family', 'retail', 'office', 'hotel', 'restaurant', 'healthcare', 'school', 'warehouse', 'other')),
  association_membership TEXT,
  
  -- Sales Team Assignment
  primary_sales_rep UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  secondary_sales_rep UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_manager UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Sales Pipeline
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'won', 'lost')),
  priority TEXT DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cold')),
  is_top_10_target BOOLEAN DEFAULT false,
  lead_source TEXT CHECK (lead_source IN ('google', 'facebook', 'referral', 'insurance', 'direct', 'cold_call')),
  
  -- Opportunity Details
  damage_type TEXT CHECK (damage_type IN ('water', 'fire', 'mold', 'storm', 'reconstruction')),
  estimated_job_value DECIMAL(10,2),
  probability_to_close INTEGER CHECK (probability_to_close >= 0 AND probability_to_close <= 100),
  
  -- Key Dates
  initial_contact_date DATE,
  insight_meeting_date DATE,
  next_followup_date DATE,
  date_closed DATE,
  first_referral_date DATE,
  lost_reason TEXT,
  
  -- Conversion
  converted_to_customer_id UUID,
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. CREATE PROSPECT_ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'site_visit', 'proposal_sent', 'lunch')),
  activity_date DATE NOT NULL,
  outcome TEXT,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. UPDATE PROPERTIES TABLE
-- ============================================
-- Add prospect_id column (keep customer_id for backward compatibility)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE;

-- Add is_primary_location column if it doesn't exist
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_primary_location BOOLEAN DEFAULT false;

-- ============================================
-- 4. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_primary_sales_rep ON prospects(primary_sales_rep);
CREATE INDEX IF NOT EXISTS idx_prospects_parent ON prospects(parent_prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospects_type ON prospects(prospect_type);
CREATE INDEX IF NOT EXISTS idx_prospects_next_followup ON prospects(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_prospects_is_top_10 ON prospects(is_top_10_target) WHERE is_top_10_target = true;

CREATE INDEX IF NOT EXISTS idx_properties_prospect ON properties(prospect_id);
CREATE INDEX IF NOT EXISTS idx_properties_primary ON properties(is_primary_location) WHERE is_primary_location = true;

CREATE INDEX IF NOT EXISTS idx_activities_prospect ON prospect_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON prospect_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_next_action_date ON prospect_activities(next_action_date);

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to prospects
DROP TRIGGER IF EXISTS prospects_updated_at ON prospects;
CREATE TRIGGER prospects_updated_at
BEFORE UPDATE ON prospects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to properties (if not already exists)
DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CREATE VIEW: prospects_with_property_count
-- ============================================
CREATE OR REPLACE VIEW prospects_with_property_count AS
SELECT 
  p.*,
  COUNT(pr.id) as properties_count
FROM prospects p
LEFT JOIN properties pr ON pr.prospect_id = p.id
GROUP BY p.id;

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================
-- Enable RLS on prospects
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Allow anon access for development (adjust when auth is added)
CREATE POLICY "Allow anon CRUD on prospects" ON prospects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on prospect_activities
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

-- Allow anon access for development
CREATE POLICY "Allow anon CRUD on prospect_activities" ON prospect_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on properties (if not already enabled)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Allow anon access for development
CREATE POLICY "Allow anon CRUD on properties" ON properties
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. DATA MIGRATION: customers → prospects
-- ============================================
-- This script migrates existing customer data to prospects
-- Run this after verifying the prospects table structure

DO $$
DECLARE
  customer_record RECORD;
  parsed_notes JSONB;
  prospect_status TEXT;
  prospect_source TEXT;
  prospect_company TEXT;
  prospect_notes TEXT;
BEGIN
  FOR customer_record IN 
    SELECT * FROM customers
  LOOP
    -- Parse notes JSON if it exists
    BEGIN
      parsed_notes := customer_record.notes::jsonb;
      prospect_status := COALESCE(parsed_notes->>'status', 'lead');
      prospect_source := COALESCE(parsed_notes->>'source', 'direct');
      prospect_company := COALESCE(parsed_notes->>'company', '');
      prospect_notes := COALESCE(parsed_notes->>'notes', customer_record.notes::text);
    EXCEPTION
      WHEN OTHERS THEN
        -- If notes is not JSON, treat as plain text
        prospect_status := 'lead';
        prospect_source := 'direct';
        prospect_company := '';
        prospect_notes := COALESCE(customer_record.notes::text, '');
    END;
    
    -- Insert into prospects
    INSERT INTO prospects (
      company_name,
      first_name,
      last_name,
      email,
      phone_primary,
      address,
      city,
      state,
      zip,
      prospect_type,
      status,
      lead_source,
      notes,
      initial_contact_date,
      first_referral_date,
      date_closed,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(customer_record.company_name, customer_record.billing_contact, prospect_company, customer_record.name),
      CASE 
        WHEN customer_record.name IS NOT NULL AND customer_record.name != '' THEN
          SPLIT_PART(customer_record.name, ' ', 1)
        ELSE NULL
      END,
      CASE 
        WHEN customer_record.name IS NOT NULL AND customer_record.name != '' AND POSITION(' ' IN customer_record.name) > 0 THEN
          SUBSTRING(customer_record.name FROM POSITION(' ' IN customer_record.name) + 1)
        ELSE NULL
      END,
      customer_record.email,
      customer_record.phone,
      COALESCE(customer_record.onsite_address, customer_record.billing_address1),
      customer_record.billing_city,
      customer_record.billing_state,
      customer_record.billing_postal,
      'commercial', -- Default to commercial
      prospect_status,
      CASE 
        WHEN prospect_source = 'website' THEN 'direct'
        WHEN prospect_source = 'referral' THEN 'referral'
        ELSE 'direct'
      END,
      prospect_notes,
      customer_record.created_at::date,
      customer_record.referral_date,
      customer_record.date_closed_committed,
      customer_record.created_at,
      customer_record.updated_at
    );
  END LOOP;
END $$;

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE prospects IS 'Prospects table for CRM - tracks commercial, agent, and adjuster prospects';
COMMENT ON TABLE prospect_activities IS 'Activity log for prospect interactions';
COMMENT ON COLUMN prospects.parent_prospect_id IS 'Reference to parent prospect for child locations';
COMMENT ON COLUMN prospects.prospect_type IS 'Type of prospect: commercial, agent, or adjuster';
COMMENT ON COLUMN prospects.is_top_10_target IS 'Flag for top 10 priority targets';
COMMENT ON COLUMN prospects.converted_to_customer_id IS 'Reference to customers table when prospect converts';

