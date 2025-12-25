-- Create labor_pricing table for T&M Estimate Schedule A (Labor)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS labor_pricing (
  id BIGSERIAL PRIMARY KEY,
  labor_type TEXT NOT NULL UNIQUE,
  category TEXT,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove duplicates first (keep the one with the lowest id for each labor_type)
DELETE FROM labor_pricing a USING labor_pricing b
WHERE a.id > b.id AND a.labor_type = b.labor_type;

-- Add display_order column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'labor_pricing' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE labor_pricing ADD COLUMN display_order INTEGER;
  END IF;
END $$;

-- Add unique constraint on labor_type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'labor_pricing_labor_type_key'
  ) THEN
    ALTER TABLE labor_pricing ADD CONSTRAINT labor_pricing_labor_type_key UNIQUE (labor_type);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labor_pricing_active ON labor_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_labor_pricing_category ON labor_pricing(category);
CREATE INDEX IF NOT EXISTS idx_labor_pricing_display_order ON labor_pricing(display_order);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_labor_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS labor_pricing_updated_at ON labor_pricing;

-- Create trigger to automatically update updated_at
CREATE TRIGGER labor_pricing_updated_at
  BEFORE UPDATE ON labor_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_labor_pricing_updated_at();

-- Clear existing data to prevent duplicates
DELETE FROM labor_pricing;

-- Insert labor pricing data from Excel (in Excel order with display_order)
INSERT INTO labor_pricing (labor_type, category, hourly_rate, description, display_order) VALUES
  ('Project Coordinator', 'Management', 145.00, 'Project coordination and oversight', 1),
  ('Sr. Project Managers', 'Management', 135.00, 'Senior project management', 2),
  ('Project Managers', 'Management', 115.00, 'Project management and oversight', 3),
  ('Health And Safety Officer', 'Specialized', 93.00, 'Health and safety oversight', 4),
  ('Remediation Supervisors', 'Supervision', 87.00, 'Remediation supervision', 5),
  ('Technical Specialist', 'Specialized', 85.00, 'Technical specialist services', 6),
  ('Asst. Project Managers', 'Management', 85.00, 'Assistant project management support', 7),
  ('Restoration Supervisor', 'Supervision', 77.00, 'Restoration supervision', 8),
  ('Content Inventory Supervisor', 'Supervision', 70.00, 'Content inventory supervision', 9),
  ('Remediation Technician', 'Field', 69.00, 'Remediation field technician', 10),
  ('CDL Driver', 'Support', 68.00, 'Commercial driver license holder', 11),
  ('Restoration Technician', 'Field', 65.00, 'Restoration field technician', 12),
  ('Resource Coordinator', 'Support', 65.00, 'Resource coordination', 13),
  ('Skilled Labor', 'Field', 62.00, 'Skilled labor services', 14),
  ('Project Clerical Administrator', 'Support', 57.00, 'Project administrative support', 15),
  ('General Laborers', 'Field', 42.00, 'General labor and assistance', 16),
  ('Project Consultant / Estimator', 'Management', 105.00, 'Project consulting and estimate preparation', 17)
ON CONFLICT (labor_type) DO UPDATE SET
  category = EXCLUDED.category,
  hourly_rate = EXCLUDED.hourly_rate,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Enable Row Level Security (RLS)
ALTER TABLE labor_pricing ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Allow all operations on labor_pricing" ON labor_pricing;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on labor_pricing" ON labor_pricing
  FOR ALL
  USING (true)
  WITH CHECK (true);


