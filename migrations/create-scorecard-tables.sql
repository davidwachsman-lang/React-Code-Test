-- ============================================
-- Performance Scorecard Tables
-- Run this in your Supabase SQL Editor
-- Creates tables for sales rep performance scorecards
-- ============================================

-- ============================================
-- 1. CREATE scorecard_settings TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scorecard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qualifying_target NUMERIC(12,2) NOT NULL DEFAULT 2000000.00,
  bonus_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.0050,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scorecard_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scorecard_settings_updated_at ON scorecard_settings;
CREATE TRIGGER scorecard_settings_updated_at
  BEFORE UPDATE ON scorecard_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_scorecard_settings_updated_at();

-- Insert default settings if none exist
INSERT INTO scorecard_settings (effective_date, qualifying_target, bonus_percentage)
SELECT CURRENT_DATE, 2000000.00, 0.0050
WHERE NOT EXISTS (SELECT 1 FROM scorecard_settings);

-- ============================================
-- 2. CREATE sales_rep_scorecards TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sales_rep_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_name TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qualifying_target NUMERIC(12,2),
  forecasted_referrals INTEGER,
  target_additional_clients INTEGER,
  kpi1_rating TEXT,
  kpi1_comments TEXT,
  kpi2_rating TEXT,
  kpi2_comments TEXT,
  kpi3_rating TEXT,
  kpi3_comments TEXT,
  overall_rating TEXT,
  overall_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_rep_name, effective_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scorecards_sales_rep ON sales_rep_scorecards(sales_rep_name);
CREATE INDEX IF NOT EXISTS idx_scorecards_effective_date ON sales_rep_scorecards(effective_date);

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scorecards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_rep_scorecards_updated_at ON sales_rep_scorecards;
CREATE TRIGGER sales_rep_scorecards_updated_at
  BEFORE UPDATE ON sales_rep_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION update_scorecards_updated_at();

-- Add comments
COMMENT ON TABLE scorecard_settings IS 'Global settings for performance scorecards (effective date, qualifying target, bonus percentage)';
COMMENT ON TABLE sales_rep_scorecards IS 'Individual performance scorecards for each sales rep with KPI targets, ratings, and comments';
COMMENT ON COLUMN sales_rep_scorecards.forecasted_referrals IS 'Manually entered forecasted referrals target for KPI 1';
COMMENT ON COLUMN sales_rep_scorecards.target_additional_clients IS 'Manually entered target for additional clients (KPI 2)';
COMMENT ON COLUMN sales_rep_scorecards.kpi1_rating IS 'Rating for KPI 1: Achieve 80% of Forecasted Referrals From Closed Clients (50% weight)';
COMMENT ON COLUMN sales_rep_scorecards.kpi2_rating IS 'Rating for KPI 2: Add Additional Clients Through Sales Process (30% weight)';
COMMENT ON COLUMN sales_rep_scorecards.kpi3_rating IS 'Rating for KPI 3: All Closed Clients Visited (F2F) (20% weight)';

