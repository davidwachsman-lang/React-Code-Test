-- Dispatch Schedules: persists the daily schedule state (replaces localStorage)
-- Each row is one day's schedule with full JSON state for the dispatch board.
-- When finalized, the system also writes normalized records to job_schedules + crew_assignments.

CREATE TABLE IF NOT EXISTS dispatch_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date DATE NOT NULL,
  schedule_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  finalized BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dispatch_schedules_date_unique UNIQUE (schedule_date)
);

-- Fast lookups by date and finalized status
CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_date ON dispatch_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_finalized ON dispatch_schedules(finalized) WHERE finalized = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dispatch_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch_schedules_updated_at ON dispatch_schedules;
CREATE TRIGGER trg_dispatch_schedules_updated_at
  BEFORE UPDATE ON dispatch_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_dispatch_schedules_updated_at();

-- RLS policies
ALTER TABLE dispatch_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dispatch schedules"
  ON dispatch_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dispatch schedules"
  ON dispatch_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dispatch schedules"
  ON dispatch_schedules FOR UPDATE
  TO authenticated
  USING (true);
