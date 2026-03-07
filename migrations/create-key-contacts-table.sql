-- Create key_contacts table linked to crm_records
CREATE TABLE IF NOT EXISTS key_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('decisionMaker', 'operations', 'finance', 'referralSource', 'gatekeeper', 'other')),
  name TEXT,
  title TEXT,
  email TEXT,
  cell TEXT,
  is_key_influencer BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by CRM record
CREATE INDEX IF NOT EXISTS idx_key_contacts_crm_id ON key_contacts(crm_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_key_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_key_contacts_updated_at
  BEFORE UPDATE ON key_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_key_contacts_updated_at();

-- Enable RLS
ALTER TABLE key_contacts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users"
  ON key_contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);
