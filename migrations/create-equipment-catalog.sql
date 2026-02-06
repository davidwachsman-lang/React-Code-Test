-- Equipment Catalog Table
-- This table stores all equipment items with their daily rates for T&M estimates

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id SERIAL PRIMARY KEY,
  equipment_name TEXT NOT NULL,
  category TEXT,
  daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_active ON equipment_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_equipment_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_catalog_updated_at
  BEFORE UPDATE ON equipment_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_catalog_updated_at();

-- Sample data (you can replace this with your actual equipment list)
INSERT INTO equipment_catalog (equipment_name, category, daily_rate, description) VALUES
  ('Air Mover - Small', 'Drying Equipment', 15.00, 'Small air mover for drying'),
  ('Air Mover - Large', 'Drying Equipment', 25.00, 'Large air mover for drying'),
  ('Dehumidifier - 150 Pint', 'Drying Equipment', 75.00, '150 pint commercial dehumidifier'),
  ('Dehumidifier - 250 Pint', 'Drying Equipment', 125.00, '250 pint commercial dehumidifier'),
  ('Air Scrubber', 'Air Quality', 85.00, 'HEPA air scrubber'),
  ('Hydroxyl Generator', 'Air Quality', 95.00, 'Hydroxyl generator for odor removal'),
  ('Moisture Meter', 'Testing Equipment', 5.00, 'Moisture detection meter'),
  ('Thermal Camera', 'Testing Equipment', 25.00, 'Thermal imaging camera'),
  ('Containment Barrier', 'Containment', 10.00, 'Temporary containment barrier per unit'),
  ('Negative Air Machine', 'Air Quality', 75.00, 'Negative air machine with HEPA filter')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on equipment_catalog" ON equipment_catalog
  FOR ALL
  USING (true)
  WITH CHECK (true);
