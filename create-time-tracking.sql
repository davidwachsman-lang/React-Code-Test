-- Create time tracking table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS time_tracking (
  id SERIAL PRIMARY KEY,
  technician_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_time_tracking_technician ON time_tracking(technician_name);
CREATE INDEX IF NOT EXISTS idx_time_tracking_job ON time_tracking(job_number);
CREATE INDEX IF NOT EXISTS idx_time_tracking_clock_in ON time_tracking(clock_in_time);

-- Add comments
COMMENT ON TABLE time_tracking IS 'Tracks technician time for jobs';
COMMENT ON COLUMN time_tracking.technician_name IS 'Name of the technician';
COMMENT ON COLUMN time_tracking.job_number IS 'Job number being worked on';
COMMENT ON COLUMN time_tracking.clock_in_time IS 'When the technician clocked in';
COMMENT ON COLUMN time_tracking.clock_out_time IS 'When the technician clocked out (NULL if still clocked in)';
COMMENT ON COLUMN time_tracking.total_hours IS 'Total hours worked (calculated on clock out)';
COMMENT ON COLUMN time_tracking.notes IS 'Optional notes about the work performed';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS time_tracking_updated_at ON time_tracking;
CREATE TRIGGER time_tracking_updated_at
  BEFORE UPDATE ON time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_time_tracking_updated_at();
