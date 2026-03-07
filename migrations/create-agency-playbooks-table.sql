-- Create agency_playbooks table
CREATE TABLE IF NOT EXISTS agency_playbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Agency Info
  agency_name TEXT,
  agency_address TEXT,
  agency_city_state_zip TEXT,
  agency_phone TEXT,
  agency_email TEXT,
  key_contacts TEXT,
  preferred_communication TEXT,

  -- 1. Portfolio & Volume
  homeowner_policies TEXT,
  commercial_policies TEXT,
  avg_monthly_claims TEXT,
  seasonal_volume_notes TEXT,

  -- 2. Claims Handling
  claims_process TEXT,
  notification_timing TEXT,
  tracking_process TEXT,
  reporting_requirements TEXT,

  -- 3. Decision Makers & Influence
  vendor_influencers TEXT,
  has_preferred_vendor_list TEXT,
  vendor_list_requirements TEXT,
  key_decision_criteria TEXT,

  -- 4. Past Experience & Pain Points
  past_frustrations TEXT,
  common_mistakes TEXT,
  communication_issues TEXT,

  -- 5. Priorities & Expectations
  most_important_outcomes TEXT[],
  confident_referral_factors TEXT,
  vendor_success_measurement TEXT,

  -- 6. Partnership & Next Steps
  six_month_vision TEXT,
  co_branded_opportunities TEXT,
  additional_support TEXT,
  update_frequency TEXT,

  -- 7. Optional Notes
  optional_notes TEXT,

  -- Metadata
  sales_rep TEXT,
  crm_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agency_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agency_playbooks_updated_at
  BEFORE UPDATE ON agency_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_playbooks_updated_at();

-- Enable RLS
ALTER TABLE agency_playbooks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users"
  ON agency_playbooks
  FOR ALL
  USING (true)
  WITH CHECK (true);
