-- Dispatch Teams: stores PM → Crew Chief hierarchy
-- Replaces the hardcoded DEFAULT_PM_GROUPS in DispatchAndScheduling.jsx

CREATE TABLE IF NOT EXISTS dispatch_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_name TEXT NOT NULL,
  pm_title TEXT NOT NULL DEFAULT '',
  crew_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dispatch_teams_crew_unique UNIQUE (crew_name)
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_dispatch_teams_pm ON dispatch_teams(pm_name);
CREATE INDEX IF NOT EXISTS idx_dispatch_teams_active ON dispatch_teams(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_dispatch_teams_sort ON dispatch_teams(sort_order);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dispatch_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch_teams_updated_at ON dispatch_teams;
CREATE TRIGGER trg_dispatch_teams_updated_at
  BEFORE UPDATE ON dispatch_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_dispatch_teams_updated_at();

-- RLS policies
ALTER TABLE dispatch_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dispatch teams"
  ON dispatch_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dispatch teams"
  ON dispatch_teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dispatch teams"
  ON dispatch_teams FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete dispatch teams"
  ON dispatch_teams FOR DELETE
  TO authenticated
  USING (true);

-- Seed default data (matches the current hardcoded values)
INSERT INTO dispatch_teams (pm_name, pm_title, crew_name, color, sort_order)
VALUES
  ('Kevin', 'Sr. Production Manager', 'Gabriel', '#3b82f6', 1),
  ('Kevin', 'Sr. Production Manager', 'David',   '#3b82f6', 2),
  ('Kevin', 'Sr. Production Manager', 'Michael', '#3b82f6', 3),
  ('Leo',   'Production Manager',     'Ramon',   '#8b5cf6', 4),
  ('Leo',   'Production Manager',     'Roger',   '#8b5cf6', 5),
  ('Aaron', 'Production Manager',     'Pedro',   '#22c55e', 6),
  ('Aaron', 'Production Manager',     'Monica',  '#22c55e', 7)
ON CONFLICT (crew_name) DO NOTHING;
