-- Create crew_assignments table for tracking crew assignments to jobs
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id BIGINT NOT NULL,
  crew_id BIGINT NOT NULL,
  assigned_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'assigned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
-- Note: Assumes jobs table exists with id column as UUID
ALTER TABLE crew_assignments
ADD CONSTRAINT fk_crew_assignments_job
FOREIGN KEY (job_id)
REFERENCES jobs(id)
ON DELETE CASCADE;

-- Note: Assumes users table exists for crew_id
-- If your crew/user table has a different name or structure, adjust accordingly
-- For now, we'll create the column but defer the foreign key constraint
-- You may need to adjust based on your actual users/crews table structure

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_crew_assignments_job_id ON crew_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew_id ON crew_assignments(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_status ON crew_assignments(status);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_assigned_date ON crew_assignments(assigned_date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crew_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS crew_assignments_updated_at ON crew_assignments;
CREATE TRIGGER crew_assignments_updated_at
  BEFORE UPDATE ON crew_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_assignments_updated_at();

-- Add comments
COMMENT ON TABLE crew_assignments IS 'Tracks crew assignments to storm jobs';
COMMENT ON COLUMN crew_assignments.job_id IS 'Foreign key to jobs table';
COMMENT ON COLUMN crew_assignments.crew_id IS 'Foreign key to users/crews table';
COMMENT ON COLUMN crew_assignments.assigned_date IS 'Date when crew was assigned to the job';
COMMENT ON COLUMN crew_assignments.status IS 'Assignment status (assigned, in_progress, completed, cancelled)';
