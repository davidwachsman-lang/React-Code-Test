-- Create activity_tracking table for sales rep activity metrics
CREATE TABLE IF NOT EXISTS activity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  sales_rep TEXT NOT NULL,
  cold_calls INTEGER DEFAULT 0,
  insight_meetings INTEGER DEFAULT 0,
  initial_commitments INTEGER DEFAULT 0,
  referral_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_start_date, sales_rep)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_activity_tracking_week_start ON activity_tracking(week_start_date);
CREATE INDEX IF NOT EXISTS idx_activity_tracking_sales_rep ON activity_tracking(sales_rep);
CREATE INDEX IF NOT EXISTS idx_activity_tracking_week_rep ON activity_tracking(week_start_date, sales_rep);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS activity_tracking_updated_at ON activity_tracking;
CREATE TRIGGER activity_tracking_updated_at
  BEFORE UPDATE ON activity_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_tracking_updated_at();

