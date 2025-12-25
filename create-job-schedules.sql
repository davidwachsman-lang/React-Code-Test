-- Job Schedules Table
-- Tracks scheduled visits/appointments for technicians

CREATE TABLE IF NOT EXISTS job_schedules (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 120,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_schedules_technician ON job_schedules(technician_name);
CREATE INDEX IF NOT EXISTS idx_job_schedules_date ON job_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_job_schedules_job_id ON job_schedules(job_id);
CREATE INDEX IF NOT EXISTS idx_job_schedules_status ON job_schedules(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_schedules_updated_at
  BEFORE UPDATE ON job_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_job_schedules_updated_at();

-- Comments
COMMENT ON TABLE job_schedules IS 'Scheduled visits and appointments for field technicians';
COMMENT ON COLUMN job_schedules.job_id IS 'Reference to the job being scheduled';
COMMENT ON COLUMN job_schedules.technician_name IS 'Name of the assigned technician';
COMMENT ON COLUMN job_schedules.scheduled_date IS 'Date of the scheduled visit';
COMMENT ON COLUMN job_schedules.scheduled_time IS 'Time of the scheduled visit';
COMMENT ON COLUMN job_schedules.duration_minutes IS 'Expected duration of the visit in minutes';
COMMENT ON COLUMN job_schedules.status IS 'Current status of the scheduled visit';
