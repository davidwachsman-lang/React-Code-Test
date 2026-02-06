-- Create storm_events table for storm event management
CREATE TABLE IF NOT EXISTS storm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT NOT NULL,
  storm_type TEXT NOT NULL,
  storm_type_other TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_storm_events_event_date ON storm_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_storm_events_location ON storm_events(location);
CREATE INDEX IF NOT EXISTS idx_storm_events_storm_type ON storm_events(storm_type);
CREATE INDEX IF NOT EXISTS idx_storm_events_is_active ON storm_events(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_storm_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS storm_events_updated_at ON storm_events;
CREATE TRIGGER storm_events_updated_at
  BEFORE UPDATE ON storm_events
  FOR EACH ROW
  EXECUTE FUNCTION update_storm_events_updated_at();

-- Add comments
COMMENT ON TABLE storm_events IS 'Stores storm events that intake entries and jobs are associated with';
COMMENT ON COLUMN storm_events.event_name IS 'Auto-generated or user-provided event name (e.g., "Flood - HB Nashville - 2026-01-15")';
COMMENT ON COLUMN storm_events.event_date IS 'Date of the storm event';
COMMENT ON COLUMN storm_events.location IS 'Location of the storm event (HB Nashville, National, Other)';
COMMENT ON COLUMN storm_events.storm_type IS 'Type of storm (Flood, Tornado, Freeze, Hurricane, Hail, Wind, Other)';
COMMENT ON COLUMN storm_events.storm_type_other IS 'Specification when storm_type is "Other"';
COMMENT ON COLUMN storm_events.is_active IS 'Whether the event is currently active';
