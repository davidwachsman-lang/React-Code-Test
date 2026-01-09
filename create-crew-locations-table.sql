-- Create crew_locations table for real-time GPS tracking of crews
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crew_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id BIGINT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  job_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for job_id (optional)
ALTER TABLE crew_locations
ADD CONSTRAINT fk_crew_locations_job
FOREIGN KEY (job_id)
REFERENCES jobs(id)
ON DELETE SET NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_crew_locations_crew_id ON crew_locations(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_locations_timestamp ON crew_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crew_locations_job_id ON crew_locations(job_id);

-- Create composite index for querying latest location per crew
CREATE INDEX IF NOT EXISTS idx_crew_locations_crew_timestamp 
ON crew_locations(crew_id, timestamp DESC);

-- Add comments
COMMENT ON TABLE crew_locations IS 'Stores real-time GPS locations of crews for tracking and dispatch';
COMMENT ON COLUMN crew_locations.crew_id IS 'Foreign key to users/crews table';
COMMENT ON COLUMN crew_locations.latitude IS 'Latitude coordinate (DECIMAL 10,8 precision)';
COMMENT ON COLUMN crew_locations.longitude IS 'Longitude coordinate (DECIMAL 11,8 precision)';
COMMENT ON COLUMN crew_locations.timestamp IS 'Timestamp when location was recorded';
COMMENT ON COLUMN crew_locations.job_id IS 'Optional foreign key to jobs table for job-specific tracking';
