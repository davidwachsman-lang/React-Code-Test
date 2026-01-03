-- Create table for role expectations notes
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS role_expectations_notes (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('manager', 'self')),
  note_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_role_expectations_notes_role ON role_expectations_notes(role);
CREATE INDEX IF NOT EXISTS idx_role_expectations_notes_role_type ON role_expectations_notes(role, note_type);
CREATE INDEX IF NOT EXISTS idx_role_expectations_notes_created_at ON role_expectations_notes(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_expectations_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER role_expectations_notes_updated_at
  BEFORE UPDATE ON role_expectations_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_role_expectations_notes_updated_at();

-- Add comments
COMMENT ON TABLE role_expectations_notes IS 'Stores manager and self notes for role-specific expectations';
COMMENT ON COLUMN role_expectations_notes.role IS 'The role name (e.g., Project Managers, Estimators)';
COMMENT ON COLUMN role_expectations_notes.note_type IS 'Type of note: manager or self';
COMMENT ON COLUMN role_expectations_notes.note_content IS 'The actual note content';
COMMENT ON COLUMN role_expectations_notes.created_by IS 'User who created the note';
COMMENT ON COLUMN role_expectations_notes.updated_by IS 'User who last updated the note';

