-- Create table for role expectations ratings
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS role_expectations_ratings (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  expectation_index INTEGER NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('meets', 'exceeds', 'does_not_meet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(role, expectation_index)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_role_expectations_ratings_role ON role_expectations_ratings(role);
CREATE INDEX IF NOT EXISTS idx_role_expectations_ratings_role_index ON role_expectations_ratings(role, expectation_index);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_expectations_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS role_expectations_ratings_updated_at ON role_expectations_ratings;

-- Create trigger to automatically update updated_at
CREATE TRIGGER role_expectations_ratings_updated_at
  BEFORE UPDATE ON role_expectations_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_role_expectations_ratings_updated_at();

-- Add comments
COMMENT ON TABLE role_expectations_ratings IS 'Stores ratings for each role-specific expectation';
COMMENT ON COLUMN role_expectations_ratings.role IS 'The role name (e.g., Project Managers, Estimators)';
COMMENT ON COLUMN role_expectations_ratings.expectation_index IS 'The index of the expectation (0-4)';
COMMENT ON COLUMN role_expectations_ratings.rating IS 'Rating: meets, exceeds, or does_not_meet';






