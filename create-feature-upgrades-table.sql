-- Create feature_upgrades table for sales rep feature upgrade suggestions
CREATE TABLE IF NOT EXISTS feature_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep TEXT NOT NULL,
  suggested_upgrade TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'implemented')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_feature_upgrades_sales_rep ON feature_upgrades(sales_rep);
CREATE INDEX IF NOT EXISTS idx_feature_upgrades_status ON feature_upgrades(status);
CREATE INDEX IF NOT EXISTS idx_feature_upgrades_created_at ON feature_upgrades(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_upgrades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS feature_upgrades_updated_at ON feature_upgrades;
CREATE TRIGGER feature_upgrades_updated_at
  BEFORE UPDATE ON feature_upgrades
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_upgrades_updated_at();

-- Add comments
COMMENT ON TABLE feature_upgrades IS 'Stores feature upgrade suggestions from sales reps';
COMMENT ON COLUMN feature_upgrades.sales_rep IS 'Sales rep name (Paige, Ainsley, Joe, Tony, Matt)';
COMMENT ON COLUMN feature_upgrades.suggested_upgrade IS 'Feature upgrade suggestion text';
COMMENT ON COLUMN feature_upgrades.status IS 'Status: pending, in_review, approved, rejected, or implemented';
