-- Create top_targets table for sales rep top 10 targets
CREATE TABLE IF NOT EXISTS top_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep TEXT NOT NULL,
  target_position INTEGER NOT NULL CHECK (target_position >= 1 AND target_position <= 10),
  company_name TEXT,
  status TEXT CHECK (status IN ('red', 'yellow', 'green')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_rep, target_position)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_top_targets_sales_rep ON top_targets(sales_rep);
CREATE INDEX IF NOT EXISTS idx_top_targets_position ON top_targets(target_position);
CREATE INDEX IF NOT EXISTS idx_top_targets_rep_position ON top_targets(sales_rep, target_position);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_top_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS top_targets_updated_at ON top_targets;
CREATE TRIGGER top_targets_updated_at
  BEFORE UPDATE ON top_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_top_targets_updated_at();

-- Add comments
COMMENT ON TABLE top_targets IS 'Stores top 10 targets for each sales rep';
COMMENT ON COLUMN top_targets.sales_rep IS 'Sales rep name (Paige, Ainsley, Joe, Tony, Matt)';
COMMENT ON COLUMN top_targets.target_position IS 'Target position (1-10)';
COMMENT ON COLUMN top_targets.company_name IS 'Target company name';
COMMENT ON COLUMN top_targets.status IS 'Status color: red, yellow, or green';

